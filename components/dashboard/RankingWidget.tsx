'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import Link from 'next/link';

export default function RankingWidget() {
  const [rankingData, setRankingData] = useState<{
    topUsers: Array<{ id: number; nombre: string; puntos: number; position: number }>;
    userRank: { position: number; total: number } | null;
    currentUserId: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const response = await fetch('/api/ranking/widget');
        if (response.ok) {
          const data = await response.json();
          setRankingData(data);
        }
      } catch (error) {
        console.error('Error fetching ranking:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-slate-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!rankingData) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 transition-colors group">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
            <Trophy className="w-6 h-6 text-blue-500" />
          </div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tu Posición</span>
        </div>
        <div className="text-3xl font-bold text-slate-100">
          -- <span className="text-lg text-slate-500 font-normal">Global</span>
        </div>
      </div>
    );
  }

  const medals = ['🥇', '🥈', '🥉'];
  const gradients = [
    'from-yellow-500/20 to-amber-600/20 border-yellow-500/40',
    'from-slate-400/20 to-slate-500/20 border-slate-400/40',
    'from-amber-600/20 to-orange-700/20 border-orange-500/40'
  ];

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <h3 className="text-slate-200 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            Top Ranking
          </h3>
          <Link 
            href="/dashboard/ranking"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            Ver todo →
          </Link>
        </div>
      </div>

      {/* Top 3 */}
      <div className="px-3 py-3 space-y-2">
        {rankingData.topUsers.slice(0, 3).map((user, index) => {
          const isCurrentUser = user.id === rankingData.currentUserId;

          return (
            <div
              key={user.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                isCurrentUser 
                  ? `bg-gradient-to-r ${gradients[index]} border-2 shadow-lg` 
                  : `bg-slate-800/50 border border-slate-700/30 hover:bg-slate-800/80`
              }`}
            >
              {/* Posición con medalla */}
              <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-2xl">
                {medals[index]}
              </div>

              {/* Info del usuario */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${
                  isCurrentUser ? 'text-white' : 'text-slate-300'
                }`}>
                  {isCurrentUser ? 'Tú' : user.nombre.split(' ')[0]}
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  {user.puntos.toLocaleString()} PC
                </p>
              </div>

              {/* Badge si es el usuario actual */}
              {isCurrentUser && (
                <div className="flex-shrink-0 px-2 py-1 bg-purple-600 rounded-full">
                  <span className="text-[10px] font-bold text-white">TÚ</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Posición del usuario si no está en el top 3 */}
      {rankingData.userRank && rankingData.userRank.position > 3 && (
        <div className="px-3 pb-3">
          <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-3"></div>
          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border-2 border-indigo-500/50 rounded-xl p-3 shadow-lg">
            <div className="text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Tu Posición</p>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                  #{rankingData.userRank.position}
                </span>
                <span className="text-sm text-slate-500">
                  de {rankingData.userRank.total}
                </span>
              </div>
              <Link
                href="/dashboard/ranking"
                className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-lg"
              >
                <Trophy className="w-3 h-3" />
                Subir de Nivel
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Si está en el top 3, mostrar una mini celebración */}
      {rankingData.userRank && rankingData.userRank.position <= 3 && (
        <div className="px-3 pb-3">
          <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-500/50 rounded-xl p-3 text-center">
            <p className="text-yellow-400 font-bold text-xs mb-1">🎉 ¡Estás en el Top 3!</p>
            <p className="text-[10px] text-yellow-200/80">Sigue así para mantenerte en la cima</p>
          </div>
        </div>
      )}
    </div>
  );
}
