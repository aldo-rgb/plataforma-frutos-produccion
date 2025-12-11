'use client';

import { useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, Circle, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';

// --- TIPO DE DATO PARA TAREA (Simulando Prisma) ---
type TareaView = {
  id: number;
  texto: string;
  categoria: string; // FINANZAS, SALUD, ETC.
  estado: 'VENCIDA' | 'HOY';
  completada: boolean;
  fechaOriginal?: string;
};

export default function MetasHoyPage() {
  
  // --- MOCK DATA (Simulando lo que traería tu filtro 'filterThingsLikeTasks') ---
  const [tareas, setTareas] = useState<TareaView[]>([
    // Tareas Vencidas (Arrastradas)
    { id: 1, texto: 'Leer 10 páginas del libro de Finanzas', categoria: 'FINANZAS', estado: 'VENCIDA', completada: false, fechaOriginal: 'Ayer' },
    { id: 2, texto: 'Subir evidencia de caminata', categoria: 'SALUD', estado: 'VENCIDA', completada: false, fechaOriginal: 'Hace 2 días' },
    
    // Tareas de Hoy
    { id: 3, texto: 'Cita con Mentor (8:00 PM)', categoria: 'RELACIONES', estado: 'HOY', completada: false },
    { id: 4, texto: 'Depositar $500 a cuenta de ahorro', categoria: 'FINANZAS', estado: 'HOY', completada: false },
    { id: 5, texto: 'Meditar 15 minutos', categoria: 'PAZ MENTAL', estado: 'HOY', completada: true }, // Ya hecha
  ]);

  // Manejador de Check (Solo visual por ahora)
  const toggleTarea = (id: number) => {
    setTareas(prev => prev.map(t => 
      t.id === id ? { ...t, completada: !t.completada } : t
    ));
  };

  const vencidas = tareas.filter(t => t.estado === 'VENCIDA' && !t.completada);
  const deHoy = tareas.filter(t => t.estado === 'HOY');

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      
      {/* Header y Navegación */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft size={20} />
            Volver al Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Calendar className="text-blue-500" size={32} />
            Tu Enfoque Diario
          </h1>
          <p className="text-slate-400">Ejecuta con precisión. Cierra ciclos.</p>
        </div>
        
        {/* Resumen Rápido */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex gap-6">
            <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{vencidas.length}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Pendientes</p>
            </div>
            <div className="w-px bg-slate-700"></div>
            <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{deHoy.filter(t => !t.completada).length}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Para Hoy</p>
            </div>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* SECCIÓN 1: VENCIDAS (Zona Roja) */}
        {vencidas.length > 0 && (
            <div className="bg-red-950/20 border border-red-900/50 rounded-2xl overflow-hidden">
                <div className="bg-red-900/30 p-4 flex items-center gap-2 border-b border-red-900/50">
                    <AlertCircle className="text-red-400" size={20} />
                    <h2 className="font-bold text-red-200">Atención Inmediata (Vencidas)</h2>
                </div>
                <div className="p-2">
                    {vencidas.map(tarea => (
                        <div key={tarea.id} className="group flex items-center gap-4 p-4 hover:bg-red-900/10 rounded-xl transition-all cursor-pointer" onClick={() => toggleTarea(tarea.id)}>
                            <button className="text-red-400 hover:text-red-300 transition-colors">
                                <Circle size={24} />
                            </button>
                            <div className="flex-1">
                                <p className="text-white font-medium text-lg">{tarea.texto}</p>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs font-bold bg-red-900/50 text-red-300 px-2 py-0.5 rounded uppercase">{tarea.categoria}</span>
                                    <span className="text-xs text-red-400/70 flex items-center gap-1">
                                        <Clock size={12} /> Vencía: {tarea.fechaOriginal}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* SECCIÓN 2: METAS DE HOY (Zona Azul) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="bg-slate-800/50 p-4 flex items-center gap-2 border-b border-slate-800">
                <Calendar className="text-blue-400" size={20} />
                <h2 className="font-bold text-blue-200">Metas de Hoy</h2>
            </div>
            <div className="p-2">
                {deHoy.map(tarea => (
                    <div key={tarea.id} className={`group flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer border-b last:border-0 border-slate-800/50 ${tarea.completada ? 'opacity-50' : 'hover:bg-slate-800'}`} onClick={() => toggleTarea(tarea.id)}>
                        <button className={`transition-colors ${tarea.completada ? 'text-green-500' : 'text-slate-500 group-hover:text-blue-400'}`}>
                            {tarea.completada ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                        </button>
                        <div className="flex-1">
                            <p className={`text-lg font-medium transition-all ${tarea.completada ? 'text-slate-500 line-through' : 'text-white'}`}>
                                {tarea.texto}
                            </p>
                            <span className="text-xs font-bold text-slate-500 uppercase mt-1 inline-block tracking-wide">
                                {tarea.categoria}
                            </span>
                        </div>
                    </div>
                ))}
                
                {deHoy.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                        <p>No tienes metas programadas para hoy. ¡Disfruta o adelanta trabajo!</p>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
