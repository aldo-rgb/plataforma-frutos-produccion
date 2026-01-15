'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  History, 
  Eye, 
  Trophy, 
  Users, 
  ChevronRight,
  Loader2,
  Sparkles,
  Atom
} from 'lucide-react';

interface VisionHistoryStats {
  totalVisiones: number;
  totalParticipantes: number;
  totalAtomos: number;
  rolesDesempenados: string[];
  userRol: string;
}

export default function VisionHistoryWidget() {
  const router = useRouter();
  const [stats, setStats] = useState<VisionHistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/user/vision-history');
      const data = await res.json();

      if (res.ok) {
        setStats({
          totalVisiones: data.visiones?.length || 0,
          totalParticipantes: data.stats?.totalParticipantes || 0,
          totalAtomos: data.stats?.totalAtomos || 0,
          rolesDesempenados: data.stats?.roles || [],
          userRol: data.user?.rol || ''
        });
      } else {
        setError(true);
      }
    } catch (error) {
      console.error('Error fetching vision history stats:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const isGameChanger = stats?.userRol === 'GAMECHANGER';

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 flex items-center justify-center min-h-[120px]">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  // Siempre mostrar el widget, incluso si hay error o no hay datos
  const displayStats = stats || { totalVisiones: 0, totalParticipantes: 0, rolesDesempenados: [] };
  
  // Para Game Changers mostrar Átomos, para otros Visiones
  const atomosCount = stats?.totalAtomos || 0;
  const visionesCount = stats?.totalVisiones || 0;
  const mainCount = isGameChanger ? atomosCount : visionesCount;
  const mainLabel = isGameChanger ? (mainCount === 1 ? 'Átomo' : 'Átomos') : (mainCount === 1 ? 'Visión' : 'Visiones');
  const mainLabelSingular = isGameChanger ? 'átomo' : 'visión';
  const mainLabelPlural = isGameChanger ? 'átomos' : 'visiones';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.005 }}
      transition={{ duration: 0.3 }}
      onClick={() => router.push('/dashboard/vision-history')}
      className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 cursor-pointer hover:border-indigo-500/50 transition-all group"
    >
      <div className="flex items-center justify-between">
        {/* Left side - Icon and Title */}
        <div className="flex items-center gap-4">
          <div className={`p-3 bg-gradient-to-br ${isGameChanger ? 'from-cyan-500 to-blue-600' : 'from-indigo-500 to-purple-600'} rounded-xl`}>
            {isGameChanger ? <Atom className="text-white" size={24} /> : <History className="text-white" size={24} />}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">{isGameChanger ? 'Mis Átomos' : 'Historial de Visiones'}</h2>
              {mainCount > 0 && (
                <span className={`px-2 py-0.5 ${isGameChanger ? 'bg-cyan-500/20 text-cyan-400' : 'bg-indigo-500/20 text-indigo-400'} text-sm font-medium rounded-full`}>
                  {mainCount} {mainCount === 1 ? mainLabelSingular : mainLabelPlural}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">{isGameChanger ? 'Grupos pequeños a tu cargo' : 'Tu trayectoria en el programa'}</p>
          </div>
        </div>

        {/* Right side - Stats and Arrow */}
        <div className="flex items-center gap-6">
          {/* Stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
              {isGameChanger ? <Atom className="w-5 h-5 text-cyan-400" /> : <Eye className="w-5 h-5 text-indigo-400" />}
              <span className={`text-2xl font-bold ${isGameChanger ? 'text-cyan-400' : 'text-indigo-400'}`}>{mainCount}</span>
              <span className="text-sm text-slate-400">{mainLabel}</span>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <span className="text-2xl font-bold text-cyan-400">{stats?.totalParticipantes || 0}</span>
              <span className="text-sm text-slate-400">Participantes</span>
            </div>
          </div>

          {/* Roles badges */}
          {stats && stats.rolesDesempenados.length > 0 && (
            <div className="hidden lg:flex flex-wrap gap-2">
              {stats.rolesDesempenados.slice(0, 3).map((rol, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-900/30 text-indigo-300 border border-indigo-600/30"
                >
                  <Trophy className="w-3 h-3" />
                  {rol}
                </span>
              ))}
            </div>
          )}

          {/* Arrow */}
          <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
        </div>
      </div>

      {/* Mobile stats - shown below on small screens */}
      <div className="flex md:hidden items-center justify-around mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center gap-2">
          {isGameChanger ? <Atom className="w-4 h-4 text-cyan-400" /> : <Eye className="w-4 h-4 text-indigo-400" />}
          <span className={`text-xl font-bold ${isGameChanger ? 'text-cyan-400' : 'text-indigo-400'}`}>{mainCount}</span>
          <span className="text-xs text-slate-400">{mainLabel}</span>
        </div>
        <div className="w-px h-6 bg-slate-700" />
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          <span className="text-xl font-bold text-cyan-400">{stats?.totalParticipantes || 0}</span>
          <span className="text-xs text-slate-400">Participantes</span>
        </div>
      </div>

      {/* Empty state hint */}
      {mainCount === 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700 text-center">
          <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            {isGameChanger ? 'Aún no tienes átomos asignados' : 'Aún no tienes visiones en tu historial'}
          </p>
        </div>
      )}
    </motion.div>
  );
}
