'use client';

import React, { useState } from 'react';
import { 
  Users, CheckCircle, XCircle, Phone, AlertTriangle, 
  Search, Filter, Eye, MessageSquare, Flame
} from 'lucide-react';
import DailyAttendanceList from '@/components/dashboard/mentor/DailyAttendanceList';

interface MentorDashboardClientProps {
  mentorId: number;
  misLideres: any[];
  evidenciasPendientes: any[];
}

export default function MentorDashboardClient({ 
  mentorId, 
  misLideres, 
  evidenciasPendientes 
}: MentorDashboardClientProps) {
  const [activeTab, setActiveTab] = useState('club5am');

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* HEADER DEL MENTOR */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black italic text-white tracking-tight uppercase">
            Centro de <span className="text-cyan-400">Mentoría</span>
          </h1>
          <p className="text-slate-400 mt-2">Gestiona el progreso y valida la integridad de tu equipo.</p>
        </div>
        
        {/* Estadísticas Rápidas */}
        <div className="flex gap-4">
          <div className="bg-slate-900 border border-white/10 px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] uppercase text-slate-500 font-bold">Líderes</p>
            <p className="text-xl font-black text-white">{misLideres.length}</p>
          </div>
          <div className="bg-slate-900 border border-yellow-500/30 px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] uppercase text-yellow-500 font-bold">Pendientes</p>
            <p className="text-xl font-black text-white">{evidenciasPendientes.length}</p>
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex gap-4 border-b border-white/5">
        <button 
          onClick={() => setActiveTab('club5am')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'club5am' ? 'border-orange-400 text-orange-400' : 'border-transparent text-slate-500 hover:text-white'}`}
        >
          <Flame className="w-4 h-4" />
          Club 5 AM
        </button>
        <button 
          onClick={() => setActiveTab('revision')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'revision' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-500 hover:text-white'}`}
        >
          Revisión de Evidencias
        </button>
        <button 
          onClick={() => setActiveTab('seguimiento')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'seguimiento' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-500 hover:text-white'}`}
        >
          Seguimiento y Llamadas
        </button>
      </div>

      {/* VISTA 0: CLUB 5 AM - CHECKLIST DIARIO */}
      {activeTab === 'club5am' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Principal: Checklist */}
          <div className="lg:col-span-2">
            <DailyAttendanceList mentorId={mentorId} />
          </div>

          {/* Columna Lateral: Consejos y Stats */}
          <div className="space-y-6">
            {/* Consejo del Día */}
            <div className="bg-gradient-to-br from-orange-900/30 to-slate-900 rounded-xl border border-orange-500/30 p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-orange-500/20 p-2 rounded-lg">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm mb-1">Consejo Matutino</h3>
                  <p className="text-xs text-slate-400">Para tus llamadas de hoy</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                "La disciplina es el puente entre metas y logros. Recuerda: cada llamada a tiempo 
                refuerza el compromiso de tus alumnos. ¡Sé puntual y enérgico!"
              </p>
            </div>

            {/* Estadísticas de la Semana */}
            <div className="bg-slate-900 rounded-xl border border-slate-700 p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                📊 Esta Semana
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Asistencias</span>
                  <span className="text-lg font-bold text-green-400">24</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Faltas</span>
                  <span className="text-lg font-bold text-red-400">3</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Tasa</span>
                  <span className="text-lg font-bold text-cyan-400">88.8%</span>
                </div>
              </div>
            </div>

            {/* Alerta de Alumnos en Riesgo */}
            <div className="bg-red-900/10 rounded-xl border border-red-500/30 p-6">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-400 text-sm mb-1">Alumnos en Riesgo</h3>
                  <p className="text-xs text-red-300/70">2 vidas o menos</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="bg-slate-900/50 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-sm text-white">Pedro K.</span>
                  <div className="flex gap-0.5">
                    <span className="text-sm">❤️</span>
                    <span className="text-sm text-slate-700">💔💔</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 1: REVISIÓN DE EVIDENCIAS (Inbox) */}
      {activeTab === 'revision' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 text-center">
            {/* Contador de evidencias pendientes */}
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-full mb-4">
                <span className="text-4xl font-black text-yellow-500">
                  {evidenciasPendientes.length}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {evidenciasPendientes.length === 0 
                  ? '¡Todo al día!' 
                  : `${evidenciasPendientes.length} evidencia${evidenciasPendientes.length !== 1 ? 's' : ''} pendiente${evidenciasPendientes.length !== 1 ? 's' : ''}`
                }
              </h2>
              <p className="text-slate-400">
                {evidenciasPendientes.length === 0
                  ? 'No hay evidencias por revisar en este momento'
                  : 'Tienes evidencias esperando tu validación'
                }
              </p>
            </div>

            {/* Botón de acceso */}
            {evidenciasPendientes.length > 0 && (
              <a
                href="/dashboard/mentor/validacion"
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
              >
                <CheckCircle size={20} />
                Ir a Validación de Evidencias
              </a>
            )}

            {evidenciasPendientes.length === 0 && (
              <div className="inline-flex items-center gap-2 text-slate-500">
                <CheckCircle size={20} className="text-green-500" />
                <span>Todas las evidencias han sido revisadas</span>
              </div>
            )}
          </div>
        </div>
      )}
                    <XCircle size={14} /> Rechazar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VISTA 2: SEGUIMIENTO Y LLAMADAS (Accountability) */}
      {activeTab === 'seguimiento' && (
        <div className="space-y-6">
          {misLideres.map((lider) => (
            <div key={lider.id} className={`bg-slate-900 border rounded-2xl overflow-hidden ${
              lider.riesgo === 'alto' ? 'border-red-500/30 shadow-lg shadow-red-500/10' : 'border-white/10'
            }`}>
              <div className="p-6 flex items-center justify-between">
                
                {/* Avatar + Datos */}
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full ${lider.avatar} flex items-center justify-center text-lg font-bold text-white`}>
                    {lider.nombre.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{lider.nombre}</h3>
                    <p className="text-slate-500 text-sm">Avance: {lider.avance}%</p>
                  </div>
                </div>

                {/* Indicadores */}
                <div className="flex items-center gap-6">
                  
                  {/* Llamadas (2 últimas) */}
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-slate-500" />
                    {lider.llamadas.map((atendida: boolean, idx: number) => (
                      <div key={idx} className={`h-6 w-6 rounded-full ${atendida ? 'bg-green-500' : 'bg-red-500'} flex items-center justify-center`}>
                        {atendida ? <CheckCircle size={14} className="text-white" /> : <XCircle size={14} className="text-white" />}
                      </div>
                    ))}
                  </div>

                  {/* Riesgo */}
                  {lider.riesgo === 'alto' && (
                    <div className="bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full flex items-center gap-1">
                      <AlertTriangle size={14} className="text-red-400" />
                      <span className="text-xs font-bold text-red-400">RIESGO</span>
                    </div>
                  )}

                  {/* Botón Ver Perfil */}
                  <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                    <Eye size={16} /> Ver Perfil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
