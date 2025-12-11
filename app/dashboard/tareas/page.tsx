'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, Square, Clock, AlertTriangle, Calendar, 
  TrendingUp, Sparkles, ChevronRight
} from 'lucide-react';
import { filterThingsLikeTasks } from '@/utils/task-filter';
import Link from 'next/link';

// Importar las categorías desde carta
const CATEGORIAS = [
  { id: 'FINANZAS', label: 'Finanzas', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  { id: 'RELACIONES', label: 'Relaciones', color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
  { id: 'TALENTOS', label: 'Talentos', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  { id: 'PAZ_MENTAL', label: 'Paz Mental', color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
  { id: 'OCIO', label: 'Diversión/Ocio', color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
  { id: 'SALUD', label: 'Salud', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  { id: 'COMUNIDAD', label: 'Comunidad', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  { id: 'ENROLAMIENTO', label: 'Enrolamiento', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
];

export default function TareasPage() {
  const [datos, setDatos] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [overdueTasks, setOverdueTasks] = useState<any[]>([]);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/carta');
        const data = await res.json();

        if (data.id) {
          // Cargar datos (similar a carta/page.tsx)
          const datosReales: any = {};
          CATEGORIAS.forEach(cat => {
            if (cat.id === 'ENROLAMIENTO') {
              datosReales[cat.id] = {
                tareas: [
                  { id: 10, texto: "Invitado 1", completado: false },
                  { id: 11, texto: "Invitado 2", completado: false },
                  { id: 12, texto: "Invitado 3", completado: false },
                  { id: 13, texto: "Invitado 4", completado: false },
                ]
              };
            } else {
              const metaKey = cat.id === 'FINANZAS' ? 'finanzasMeta' :
                            cat.id === 'RELACIONES' ? 'relacionesMeta' :
                            cat.id === 'TALENTOS' ? 'talentosMeta' :
                            cat.id === 'PAZ_MENTAL' ? 'pazMentalMeta' :
                            cat.id === 'OCIO' ? 'ocioMeta' :
                            cat.id === 'SALUD' ? 'saludMeta' :
                            cat.id === 'COMUNIDAD' ? 'servicioComunMeta' : '';
              
              const metaTexto = data[metaKey] || '';
              
              datosReales[cat.id] = {
                tareas: [
                  { 
                    id: 1, 
                    texto: metaTexto, 
                    completado: false,
                    scheduledDays: [], // Aquí se cargarían desde BD
                    lastCompletedDate: null,
                    categoria: cat.label,
                    categoriaId: cat.id,
                    color: cat.color,
                    bgColor: cat.bgColor,
                  },
                ]
              };
            }
          });
          setDatos(datosReales);

          // 🚨 APLICAR FILTRO THINGS-LIKE
          // 1. Obtener todas las tareas (aplanar el objeto datos)
          const allTasks = Object.keys(datosReales).flatMap(catId => {
            const cat = CATEGORIAS.find(c => c.id === catId);
            return datosReales[catId].tareas.map((tarea: any) => ({
              ...tarea,
              categoria: cat?.label,
              categoriaId: catId,
              color: cat?.color,
              bgColor: cat?.bgColor,
            }));
          });

          // 2. Ejecutar la función de filtrado
          const { overdueTasks: overdue, todayTasks: today } = filterThingsLikeTasks(
            allTasks.filter((t: any) => t.id === 1), // Solo tareas principales
            new Date()
          );

          setOverdueTasks(overdue);
          setTodayTasks(today);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggleTask = async (task: any) => {
    // Aquí implementarías la lógica de completar tarea
    console.log('Completar tarea:', task);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Cargando tareas...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/carta" className="text-slate-400 hover:text-white mb-4 inline-flex items-center gap-2">
            ← Volver a Carta
          </Link>
          <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
            <Sparkles className="text-cyan-400" size={32} />
            Mis Tareas
          </h1>
          <p className="text-slate-400">Vista Things-like: Tareas vencidas y de hoy</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
            <div className="text-red-400 text-sm font-medium mb-1">Vencidas</div>
            <div className="text-3xl font-black text-white">{overdueTasks.length}</div>
          </div>
          <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-xl p-4">
            <div className="text-cyan-400 text-sm font-medium mb-1">Hoy</div>
            <div className="text-3xl font-black text-white">{todayTasks.length}</div>
          </div>
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
            <div className="text-emerald-400 text-sm font-medium mb-1">Total Pendientes</div>
            <div className="text-3xl font-black text-white">{overdueTasks.length + todayTasks.length}</div>
          </div>
        </div>

        {/* Tareas Vencidas */}
        {overdueTasks.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-400" size={24} />
              <h2 className="text-2xl font-black text-white">
                🚨 Tareas Vencidas ({overdueTasks.length})
              </h2>
            </div>
            <div className="space-y-3">
              {overdueTasks.map((tarea: any) => (
                <div
                  key={`${tarea.categoriaId}-${tarea.id}`}
                  className={`${tarea.bgColor} border-2 border-red-500/50 rounded-xl p-4 flex items-start gap-4 hover:border-red-400/70 transition-all`}
                >
                  <button
                    onClick={() => handleToggleTask(tarea)}
                    className="mt-1 text-red-400 hover:text-red-300"
                  >
                    <Square size={24} />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${tarea.color}`}>
                        {tarea.categoria}
                      </span>
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <Clock size={12} /> Vencida
                      </span>
                    </div>
                    <p className="text-white font-medium">{tarea.texto}</p>
                    {tarea.scheduledDays && tarea.scheduledDays.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                        <Calendar size={12} />
                        {tarea.scheduledDays.join(', ')}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="text-slate-600" size={20} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tareas de Hoy */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-cyan-400" size={24} />
            <h2 className="text-2xl font-black text-white">
              📅 Tareas de Hoy ({todayTasks.length})
            </h2>
          </div>
          {todayTasks.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
              <TrendingUp className="text-slate-600 mx-auto mb-3" size={48} />
              <p className="text-slate-400">No tienes tareas programadas para hoy</p>
              <Link href="/dashboard/carta" className="text-cyan-400 hover:text-cyan-300 text-sm mt-2 inline-block">
                Configura tus metas →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((tarea: any) => (
                <div
                  key={`${tarea.categoriaId}-${tarea.id}`}
                  className={`${tarea.bgColor} border-2 border-slate-700 rounded-xl p-4 flex items-start gap-4 hover:border-cyan-500/50 transition-all`}
                >
                  <button
                    onClick={() => handleToggleTask(tarea)}
                    className="mt-1 text-slate-400 hover:text-cyan-400"
                  >
                    <Square size={24} />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${tarea.color}`}>
                        {tarea.categoria}
                      </span>
                      <span className="text-xs text-cyan-400">Hoy</span>
                    </div>
                    <p className="text-white font-medium">{tarea.texto}</p>
                    {tarea.scheduledDays && tarea.scheduledDays.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                        <Calendar size={12} />
                        {tarea.scheduledDays.join(', ')}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="text-slate-600" size={20} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
