'use client';

import { useState } from 'react';
import { 
  Calendar, AlertTriangle, Check, Clock, Upload, 
  RotateCw, Image as ImageIcon 
} from 'lucide-react';
import { format, differenceInCalendarDays, isPast, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface SmartTaskProps {
  task: {
    id: number;
    accionId: number;
    metaId: number;
    title: string;
    areaType: string;
    identity: string;
    dueDate: string;
    originalDueDate?: string | null;
    status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
    postponeCount: number;
    completedAt?: string | null;
    evidenceUrl?: string | null;
    evidenceStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
    feedbackMentor?: string | null;
  };
  onUpdate: (taskId: number, action: 'POSTPONE', days?: number) => Promise<void>;
  onUploadEvidence: (taskId: number, accionId: number, metaId: number) => void;
}

export default function SmartTask({ task, onUpdate, onUploadEvidence }: SmartTaskProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Debug: Ver datos de la tarea
  console.log('🔍 SmartTask recibida:', {
    id: task.id,
    title: task.title,
    evidenceStatus: task.evidenceStatus,
    feedbackMentor: task.feedbackMentor
  });

  // 1. CÁLCULO DE RETRASO REAL (Basado en fecha original)
  const calculateDelayLabel = () => {
    // Si ya está completada o pendiente de aprobación, no mostramos retraso
    if (task.evidenceStatus === 'PENDING' || task.status === 'COMPLETED') return null;

    const baseDate = parseISO(task.originalDueDate || task.dueDate);
    if (!isPast(baseDate) || isToday(baseDate)) return null;

    const daysLate = differenceInCalendarDays(new Date(), baseDate);
    
    // Regla de negocio: 1 día = "Retrasada", >1 día = "Retrasada X días"
    if (daysLate === 1) return { label: "Retrasada", originalDate: baseDate };
    if (daysLate > 1) return { label: `Retrasada ${daysLate} días`, originalDate: baseDate };
    
    return null;
  };

  const delayInfo = calculateDelayLabel();

  // 2. MANEJO DE EVIDENCIA
  const handleCircleClick = () => {
    if (task.status === 'COMPLETED') return;
    if (task.evidenceStatus === 'PENDING') return; // Bloqueado si espera mentor
    
    // Abrir modal de evidencia
    onUploadEvidence(task.id, task.accionId, task.metaId);
  };

  // 3. COLORES POR ÁREA
  const areaColors: Record<string, { bg: string; text: string; border: string }> = {
    'FINANZAS': { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
    'RELACIONES': { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
    'TALENTOS': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
    'SALUD': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
    'PAZ MENTAL': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
    'OCIO': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    'SERVICIO TRANSFORMADOR': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
    'SERVICIO COMÚN': { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/30' },
  };

  const areaColor = areaColors[task.areaType] || { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' };

  return (
    <div className="relative bg-[#1a1d2d] rounded-xl border border-gray-800 p-4 mb-3 transition-all hover:border-gray-600">
      
      <div className="flex items-start gap-4">

        {/* CONTENIDO CENTRAL */}
        <div className="flex-1 min-w-0">
          
          {/* Título y Estado */}
          <div className="flex justify-between items-start">
            <h4 className={`text-base font-medium ${task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-white'}`}>
              {task.title}
            </h4>
          </div>

          {/* Subtítulo: Área y Contexto */}
          <div className="flex items-center gap-2 mt-1 mb-2">
            <span className={`text-[10px] ${areaColor.bg} ${areaColor.text} px-2 py-0.5 rounded uppercase font-bold tracking-wider border ${areaColor.border}`}>
              {task.areaType}
            </span>
            <span className="text-xs text-gray-500 italic truncate max-w-[300px]">
              "{task.identity}"
            </span>
          </div>

          {/* C. ZONA DE ALERTAS Y ESTADOS */}
          <div className="flex flex-wrap gap-2 items-center mt-2">
            
            {/* Etiqueta de Retraso Persistente */}
            {delayInfo && (
              <div className="flex items-center gap-1.5 text-red-400 bg-red-400/10 px-2 py-1 rounded text-xs font-bold border border-red-400/20">
                <AlertTriangle size={12} />
                <span>{delayInfo.label}</span>
                <span className="text-red-500/50 text-[10px] font-normal">
                  (desde {format(delayInfo.originalDate, 'd MMM', { locale: es })})
                </span>
              </div>
            )}

            {/* Etiqueta de Pendiente revisión */}
            {task.evidenceStatus === 'PENDING' && (
              <div className="flex items-center gap-1.5 text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded text-xs font-bold border border-yellow-400/20 animate-pulse">
                <Clock size={12} />
                <span>Pendiente de Revisión</span>
              </div>
            )}

            {/* Etiqueta de Evidencia Rechazada - MÁS VISIBLE */}
            {task.evidenceStatus === 'REJECTED' && (
              <div className="flex items-center gap-1.5 text-red-100 bg-gradient-to-r from-red-600 to-red-500 px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-red-400 shadow-lg shadow-red-500/50 animate-pulse">
                <AlertTriangle size={14} className="animate-bounce" />
                <span className="uppercase tracking-wide">⚠️ Evidencia Rechazada</span>
              </div>
            )}

            {/* Contador de Procrastinación */}
            {task.postponeCount > 0 && (
              <div className="flex items-center gap-1 text-gray-400 text-xs bg-gray-800 px-2 py-1 rounded">
                <RotateCw size={10} />
                <span>Pospuesta {task.postponeCount} {task.postponeCount === 1 ? 'vez' : 'veces'}</span>
              </div>
            )}
          </div>

          {/* D. FEEDBACK DEL MENTOR (Si la evidencia fue rechazada) */}
          {task.evidenceStatus === 'REJECTED' && task.feedbackMentor && (
            <div className="mt-3 bg-red-950/40 border-l-4 border-red-500 p-3 rounded-r-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-200 font-semibold text-xs mb-1">Comentario del Mentor:</p>
                  <p className="text-red-100 text-sm leading-relaxed">{task.feedbackMentor}</p>
                </div>
              </div>
            </div>
          )}

          {/* E. VISOR DE EVIDENCIA (Si ya subió algo) */}
          {task.evidenceUrl && (
             <div className="mt-3 flex items-center gap-2">
                <button 
                  onClick={() => {
                    // Abrir modal de evidencia para ver/cambiar
                    onUploadEvidence(task.id, task.accionId, task.metaId);
                  }}
                  className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <ImageIcon size={12} /> Ver foto subida
                </button>
             </div>
          )}

          {/* F. BOTÓN DE SUBIR EVIDENCIA */}
          {task.status !== 'COMPLETED' && task.evidenceStatus !== 'PENDING' && (
            <div className="mt-3">
              <button
                onClick={handleCircleClick}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  task.evidenceStatus === 'REJECTED'
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-xl shadow-red-500/50 animate-pulse border-2 border-red-400'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg'
                }`}
              >
                <Upload size={16} />
                {task.evidenceStatus === 'REJECTED' ? '🔄 Reenviar Evidencia Corregida' : 'Subir Evidencia'}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* G. BOTÓN DE REAGENDAR (Siempre visible y claro) */}
      {task.status !== 'COMPLETED' && task.evidenceStatus !== 'PENDING' && (
        <div className="absolute top-4 right-4">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#252836] hover:bg-[#2d3042] text-gray-300 hover:text-white text-xs font-medium transition-all border border-gray-700 hover:border-gray-600"
          >
            <Calendar size={12} />
            <span>Reagendar</span>
          </button>

          {/* Menú Dropdown */}
          {isMenuOpen && (
            <>
              {/* Overlay para cerrar al hacer click fuera */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsMenuOpen(false)}
              />
              
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#0f111a] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="p-2 bg-gray-900/50 border-b border-gray-800">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Mover para...</p>
                </div>
                <button 
                  onClick={() => { 
                    onUpdate(task.id, 'POSTPONE', 1); 
                    setIsMenuOpen(false); 
                  }} 
                  className="w-full text-left p-3 hover:bg-gray-800 text-white text-sm flex items-center gap-2 transition-colors"
                >
                  <span>Mañana</span>
                  <span className="text-gray-500 text-xs ml-auto">+1 día</span>
                </button>
                <button 
                  onClick={() => { 
                    onUpdate(task.id, 'POSTPONE', 3); 
                    setIsMenuOpen(false); 
                  }} 
                  className="w-full text-left p-3 hover:bg-gray-800 text-white text-sm flex items-center gap-2 transition-colors"
                >
                  <span>En 3 días</span>
                  <span className="text-gray-500 text-xs ml-auto">+3 días</span>
                </button>
                <button 
                  onClick={() => { 
                    onUpdate(task.id, 'POSTPONE', 7); 
                    setIsMenuOpen(false); 
                  }} 
                  className="w-full text-left p-3 hover:bg-gray-800 text-white text-sm flex items-center gap-2 transition-colors border-t border-gray-800"
                >
                  <span>Próxima Semana</span>
                  <span className="text-gray-500 text-xs ml-auto">+7 días</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
