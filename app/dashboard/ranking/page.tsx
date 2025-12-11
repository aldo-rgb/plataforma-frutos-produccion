'use client';

import React, { useState, useEffect } from 'react';
import { Zap, Trophy, TrendingUp, Sparkles, UserCircle } from 'lucide-react';

interface Leader {
  id: number;
  nombre: string;
  puntos: number;
  avatar: string;
  vision?: string;
}

interface RankingByVision {
  vision: string;
  lideres: Leader[];
}

export default function RankingPage() {
  const [rankingByVision, setRankingByVision] = useState<RankingByVision[]>([]);
  const [loading, setLoading] = useState(true);
  const [userVision, setUserVision] = useState<string | null>(null);

  useEffect(() => {
    // 1. OBTENER VISIÓN DEL USUARIO Y RANKING FILTRADO
    const fetchData = async () => {
      try {
        // Obtener perfil del usuario con su visión
        const profileRes = await fetch('/api/user/profile');
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUserVision(profileData.vision);
          
          // Obtener ranking filtrado por la visión del usuario
          const visionParam = profileData.vision ? `?vision=${encodeURIComponent(profileData.vision)}` : '';
          const rankingRes = await fetch(`/api/ranking/global${visionParam}`);
          
          if (!rankingRes.ok) throw new Error('Error al cargar el ranking');
          const rankingData = await rankingRes.json();
          setRankingByVision(rankingData);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Función para asignar el estilo de medalla
  const getMedalStyle = (index: number) => {
    switch (index) {
      case 0: return 'text-amber-400 bg-amber-400/10 border-amber-400/30'; // Oro
      case 1: return 'text-slate-300 bg-slate-300/10 border-slate-300/30'; // Plata
      case 2: return 'text-yellow-700 bg-yellow-700/10 border-yellow-700/30'; // Bronce
      default: return 'text-slate-500 bg-slate-800 border-slate-700'; // Normal
    }
  };

  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy size={20} className="text-amber-400 fill-amber-400/50" />;
      case 1: return <Trophy size={20} className="text-slate-300 fill-slate-300/50" />;
      case 2: return <Trophy size={20} className="text-yellow-700 fill-yellow-700/50" />;
      default: return <UserCircle size={20} />;
    }
  };

  if (loading) {
    return <div className="text-white text-center py-20">Cargando Ranking...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-end border-b border-white/10 pb-6">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500">Quantum</span> Leaderboard
          </h1>
          <p className="text-slate-400 mt-2 flex items-center gap-2">
            <TrendingUp size={18} className='text-green-400' />
            {userVision ? (
              <>Top Líderes de tu Visión: <span className="text-cyan-400 font-bold">{userVision}</span></>
            ) : (
              'Top Líderes con más Puntos Cuánticos.'
            )}
          </p>
        </div>
      </div>

      {/* RANKINGS POR VISIÓN */}
      {rankingByVision.map((visionRanking, visionIndex) => (
        <div key={visionIndex} className="space-y-6">
          {/* Título de la Visión */}
          <div className="flex items-center gap-3 pt-4">
            <Sparkles className="text-cyan-400" size={24} />
            <h2 className="text-2xl font-black text-white">
              Visión: <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">{visionRanking.vision}</span>
            </h2>
          </div>

          {/* TARJETA DEL TOP 3 POR VISIÓN */}
          <div className="flex justify-center items-end gap-4">
            {visionRanking.lideres.slice(0, 3).map((leader, index) => (
              <div 
                key={leader.id} 
                className={`flex flex-col items-center p-4 rounded-xl shadow-2xl transition-all duration-300 
                  ${index === 0 ? 'scale-110 bg-slate-900 border-4 border-amber-400/50 -translate-y-4' : 
                   index === 1 ? 'bg-slate-900 border-2 border-slate-300/50' : 
                   'bg-slate-900 border-2 border-yellow-700/50'
                }`}
              >
                <div className={`p-3 rounded-full mb-3 border ${getMedalStyle(index)}`}>
                  {getMedalIcon(index)}
                </div>
                <p className="text-xs font-bold uppercase text-slate-400">#{index + 1}</p>
                <h3 className={`font-black text-center mt-1 ${index === 0 ? 'text-xl text-white' : 'text-lg text-slate-200'}`}>
                  {leader.nombre.split(' ')[0]}
                </h3>
                <div className="flex items-center gap-1 text-yellow-400 font-bold mt-2">
                  <Zap size={16} fill="currentColor" />
                  <span className="text-lg">{leader.puntos.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* TABLA COMPLETA DEL RANKING POR VISIÓN */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Líder</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Puntos Cuánticos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visionRanking.lideres.map((leader, index) => (
                  <tr 
                    key={leader.id} 
                    className={`transition-colors hover:bg-slate-800 
                        ${index < 3 ? 'bg-slate-800/70' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${getMedalStyle(index)}`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-2xl mr-3">{leader.avatar}</div>
                        <div className="text-sm font-medium text-white">
                          {leader.nombre}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-yellow-400">
                      <div className="flex justify-end items-center gap-1">
                        <Zap size={14} fill="currentColor" />
                        {leader.puntos.toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

    </div>
  );
}