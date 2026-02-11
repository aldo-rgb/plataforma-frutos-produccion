'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Users, Eye, Trophy, Zap, Target, Star, ScrollText, Camera } from 'lucide-react';
import Link from 'next/link';

interface Participante {
  id: number;
  nombre: string;
  email: string;
  puntosCultivo: number;
  puntosQuantum: number;
  xp: number;
  racha: number;
  tier: string;
  ranking: number;
  cartaId?: number;
  cartaEstado?: string;
  cartaAutorizada?: boolean;
  mentoringStartDate?: string;
}

export default function GameChangerParticipantesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'GAMECHANGER') {
      router.push('/dashboard');
    } else {
      fetchParticipantes();
    }
  }, [status, session]);

  const fetchParticipantes = async () => {
    try {
      const res = await fetch('/api/gamechanger/mis-participantes');
      const result = await res.json();
      if (res.ok && result.success) {
        setParticipantes(result.participantes || []);
      }
    } catch (error) {
      console.error('Error fetching participantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      'Bronce': 'text-orange-600',
      'Plata': 'text-slate-400',
      'Oro': 'text-yellow-400',
      'Platino': 'text-cyan-400',
      'Diamante': 'text-blue-400'
    };
    return colors[tier] || 'text-slate-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <GraduationCap size={32} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Mis Participantes</h1>
              <p className="text-slate-400">Participantes asignados bajo tu mentoreo</p>
            </div>
          </div>
        </div>

        {/* Participantes List */}
        {participantes.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center">
            <GraduationCap size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">No hay participantes asignados</h3>
            <p className="text-slate-500">Aún no tienes participantes bajo tu mentoreo</p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users size={24} className="text-purple-400" />
              <h2 className="text-xl font-bold text-white">
                {participantes.length} Participante{participantes.length !== 1 ? 's' : ''}
              </h2>
            </div>

            <div className="space-y-3">
              {participantes.map((participante, index) => (
                <div
                  key={participante.id}
                  className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 hover:border-purple-500/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-slate-800 rounded-lg">
                        <span className="text-lg font-bold text-purple-400">#{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white mb-1">
                          {participante.nombre}
                        </h4>
                        <p className="text-sm text-slate-400">{participante.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {participante.cartaAutorizada && (
                        <Link
                          href={`/dashboard/gamechanger/carta/${participante.id}`}
                          className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-400 rounded-lg font-bold transition-all flex items-center gap-2"
                          title="Ver Carta"
                        >
                          <ScrollText size={18} />
                          Ver Carta
                        </Link>
                      )}
                      
                      <Link
                        href={`/dashboard/gamechanger/participante/${participante.id}/vault`}
                        className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400 rounded-lg font-bold transition-all flex items-center gap-2"
                        title="Ver Vault"
                      >
                        <Camera size={18} />
                        Ver Vault
                      </Link>
                      
                      <Link
                        href={`/dashboard/gamechanger/participante/${participante.id}`}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold transition-all flex items-center gap-2"
                      >
                        <Eye size={18} />
                        Ver Perfil
                      </Link>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy size={16} className={getTierColor(participante.tier)} />
                        <span className="text-xs text-slate-400">Tier</span>
                      </div>
                      <p className={`text-lg font-bold ${getTierColor(participante.tier)}`}>
                        {participante.tier}
                      </p>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap size={16} className="text-yellow-400" />
                        <span className="text-xs text-slate-400">XP</span>
                      </div>
                      <p className="text-lg font-bold text-white">
                        {participante.xp.toLocaleString()}
                      </p>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Target size={16} className="text-purple-400" />
                        <span className="text-xs text-slate-400">Quantum</span>
                      </div>
                      <p className="text-lg font-bold text-purple-300">
                        {participante.puntosQuantum}
                      </p>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Star size={16} className="text-orange-400" />
                        <span className="text-xs text-slate-400">Racha</span>
                      </div>
                      <p className="text-lg font-bold text-orange-300">
                        {participante.racha} días
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
