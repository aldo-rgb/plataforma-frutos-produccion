'use client';

import { motion } from 'framer-motion';
import { Target, Star, FileText, ChevronRight, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AreaProgress {
  key: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  declaration?: string;
  percent: number;
  tasksCompleted: number;
  tasksTotal: number;
}

interface SaltosCuanticosData {
  areas: AreaProgress[];
  totalPercent: number;
  hasCompletedCarta: boolean;
}

const areaConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
  finanzas: { icon: '💰', color: 'text-green-400', bgColor: 'bg-green-500' },
  relaciones: { icon: '❤️', color: 'text-pink-400', bgColor: 'bg-pink-500' },
  talentos: { icon: '🎯', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  pazMental: { icon: '🧘', color: 'text-purple-400', bgColor: 'bg-purple-500' },
  ocio: { icon: '🎮', color: 'text-orange-400', bgColor: 'bg-orange-500' },
  salud: { icon: '💪', color: 'text-blue-400', bgColor: 'bg-blue-500' },
  servicioTrans: { icon: '🦋', color: 'text-violet-400', bgColor: 'bg-violet-500' },
  servicioComun: { icon: '🤝', color: 'text-teal-400', bgColor: 'bg-teal-500' },
};

const areaLabels: Record<string, string> = {
  finanzas: 'Finanzas',
  relaciones: 'Relaciones',
  talentos: 'Talentos',
  pazMental: 'Paz Mental',
  ocio: 'Ocio',
  salud: 'Salud',
  servicioTrans: 'Transformacional',
  servicioComun: 'Comunitaria',
};

export default function SaltosCuanticosWidget() {
  const router = useRouter();
  const [data, setData] = useState<SaltosCuanticosData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/carta/progress-areas');
      const json = await res.json();
      
      if (json.success) {
        setData({
          areas: json.data.areas.map((area: any) => ({
            key: area.key,
            label: areaLabels[area.key] || area.label,
            icon: areaConfig[area.key]?.icon || '📌',
            color: areaConfig[area.key]?.color || 'text-slate-400',
            bgColor: areaConfig[area.key]?.bgColor || 'bg-slate-500',
            declaration: area.declaration,
            percent: area.percent,
            tasksCompleted: area.tasksCompleted,
            tasksTotal: area.tasksTotal,
          })),
          totalPercent: json.data.totalPercent,
          hasCompletedCarta: json.data.hasCompletedCarta,
        });
      }
    } catch (error) {
      console.error('Error fetching saltos cuanticos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full rounded-2xl bg-slate-900 border border-cyan-500/20 shadow-2xl mb-6 p-8">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-slate-400">Cargando objetivos...</span>
        </div>
      </div>
    );
  }

  if (!data?.hasCompletedCarta) {
    return (
      <div className="w-full rounded-2xl bg-gradient-to-br from-cyan-900/20 via-slate-900 to-slate-900 border border-cyan-500/20 shadow-2xl mb-6 overflow-hidden">
        <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            Los Saltos Cuánticos
          </h3>
          <p className="text-slate-400 text-xs mt-1">Tu compromiso contigo mismo</p>
        </div>
        <div className="text-center py-12 px-4">
          <div className="w-20 h-20 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-10 h-10 text-slate-600" />
          </div>
          <p className="text-slate-300 font-semibold mb-2">Completa tu Carta F.R.U.T.O.S.</p>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Define tus metas y declaraciones para cada área de tu vida
          </p>
          <Link
            href="/dashboard/carta"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-semibold transition-all shadow-lg shadow-cyan-500/20"
          >
            <Zap className="w-5 h-5" />
            Completar Carta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-cyan-900/10 via-slate-900 to-slate-900 border border-cyan-500/30 shadow-2xl mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
            <Target className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Los Saltos Cuánticos</h3>
            <p className="text-slate-400 text-xs">Tu compromiso contigo mismo</p>
          </div>
        </div>
        <Link
          href="/dashboard/progreso-frutos"
          className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
        >
          Ver Objetivos
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Areas Grid */}
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {data.areas.map((area, idx) => (
            <motion.div
              key={area.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => router.push(`/dashboard/hoy?area=${area.key}`)}
              className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{area.icon}</span>
                <h4 className={`text-sm font-medium ${area.color} group-hover:scale-105 transition-transform`}>{area.label}</h4>
              </div>
              
              {area.declaration ? (
                <>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3 min-h-[32px]">
                    "{area.declaration}"
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{area.tasksCompleted}/{area.tasksTotal} tareas</span>
                      <span className={`font-bold ${area.color}`}>{area.percent}%</span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${area.percent}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.1, ease: "easeOut" }}
                        className={`h-full ${area.bgColor} rounded-full`}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-2">
                  <Star className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">Sin declaración</p>
                </div>
              )}
              
              {/* Hover indicator */}
              <div className="mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-cyan-400">Ver tareas →</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Motivational Quote - Más prominente y con valor */}
        <div className="mt-8 pt-6 border-t border-slate-700/50">
          <div className="bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 rounded-xl p-5 border border-cyan-500/20">
            <p className="text-center text-lg font-semibold text-white mb-2">
              🎯 Tu palabra es tu compromiso
            </p>
            <p className="text-center text-sm text-slate-300">
              Cada tarea completada es una evidencia mas de la persona que declaraste ser. 
              <span className="text-cyan-400 font-medium"> Honra lo que declaraste.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
