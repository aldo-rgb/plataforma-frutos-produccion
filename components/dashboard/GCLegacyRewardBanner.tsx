'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Phone, 
  X, 
  ChevronRight, 
  Gift, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Trophy
} from 'lucide-react';
import Link from 'next/link';

interface PendingReward {
  visionId: number;
  visionName: string;
  organizationName: string;
  level: string;
  endDate: string;
  diasRestantes: number;
  terminoHoy: boolean;
  yaTermino: boolean;
  totalParticipantes: number;
  legacyCount: number;
  postEntrenoCount: number;
  legacyProgress: number;
  postEntrenoProgress: number;
  canClaim: boolean;
  rewardAmount: number;
}

export default function GCLegacyRewardBanner() {
  const [pendingRewards, setPendingRewards] = useState<PendingReward[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingRewards();
  }, []);

  const fetchPendingRewards = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/gc/legacy-reward-status');
      const data = await res.json();
      
      if (data.success && data.pendingRewards?.length > 0) {
        setPendingRewards(data.pendingRewards);
      }
    } catch (error) {
      console.error('Error fetching legacy reward status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (visionId: number) => {
    setClaiming(true);
    try {
      const res = await fetch('/api/gc/legacy-reward-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visionId })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setClaimed(true);
        // Remover de la lista después de 3 segundos
        setTimeout(() => {
          setPendingRewards(prev => prev.filter(r => r.visionId !== visionId));
          setClaimed(false);
        }, 3000);
      } else {
        alert(data.error || 'Error al reclamar puntos');
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      alert('Error al reclamar puntos');
    } finally {
      setClaiming(false);
    }
  };

  if (loading || pendingRewards.length === 0 || dismissed) {
    return null;
  }

  const reward = pendingRewards[0];
  const isComplete = reward.canClaim;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-4"
      >
        <div className={`relative overflow-hidden rounded-2xl border-2 ${
          claimed
            ? 'bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 border-green-500/50'
            : isComplete 
              ? 'bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 border-purple-500/50' 
              : 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-amber-500/50'
        }`}>
          {/* Efecto de brillo animado */}
          {!claimed && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
          )}
          
          <div className="relative p-4">
            <div className="flex items-center justify-between gap-4">
              {/* Icono y contenido */}
              <div className="flex items-center gap-4 flex-1">
                <div className="flex-shrink-0">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    claimed
                      ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                      : isComplete 
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse' 
                        : 'bg-gradient-to-br from-amber-500 to-orange-500'
                  }`}>
                    {claimed ? (
                      <CheckCircle className="w-7 h-7 text-white" />
                    ) : isComplete ? (
                      <Trophy className="w-7 h-7 text-white" />
                    ) : (
                      <Gift className="w-7 h-7 text-white" />
                    )}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold text-sm sm:text-base">
                      {claimed 
                        ? '🎉 ¡Puntos Reclamados!' 
                        : isComplete 
                          ? '🏆 ¡Ganaste 1,000 PC!' 
                          : '🎁 Gana 1,000 PC - Completa tu Cierre'
                      }
                    </h3>
                    {reward.terminoHoy && !claimed && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/30 text-red-300 animate-pulse">
                        ¡HOY!
                      </span>
                    )}
                  </div>
                  
                  {claimed ? (
                    <p className="text-green-300 text-xs sm:text-sm flex items-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      Has recibido 1,000 PC y 1,000 XP por tu excelente trabajo
                    </p>
                  ) : isComplete ? (
                    <p className="text-purple-200/80 text-xs sm:text-sm">
                      Completaste Legacy y Post-Entreno de <span className="font-semibold text-purple-300">{reward.visionName}</span>
                    </p>
                  ) : (
                    <>
                      <p className="text-amber-200/80 text-xs sm:text-sm">
                        <span className="font-semibold text-amber-300">{reward.visionName}</span> - {reward.totalParticipantes} participantes
                      </p>
                      
                      {/* Barras de progreso */}
                      <div className="flex gap-4 mt-2">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-pink-400 flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              Legacy
                            </span>
                            <span className="text-white font-medium">{reward.legacyCount}/{reward.totalParticipantes}</span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                              style={{ width: `${reward.legacyProgress}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-cyan-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              Post-Entreno
                            </span>
                            <span className="text-white font-medium">{reward.postEntrenoCount}/{reward.totalParticipantes}</span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                              style={{ width: `${reward.postEntrenoProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {claimed ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-green-600/50 rounded-xl text-green-300 font-semibold text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>+1,000 PC</span>
                  </div>
                ) : isComplete ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleClaimReward(reward.visionId)}
                    disabled={claiming}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-semibold text-sm shadow-lg shadow-purple-500/30 transition-all disabled:opacity-50"
                  >
                    {claiming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span className="hidden sm:inline">Reclamar 1,000 PC</span>
                        <span className="sm:hidden">Reclamar</span>
                      </>
                    )}
                  </motion.button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    {reward.legacyProgress < 100 && (
                      <Link href="/dashboard/game-changer/legacy-capture">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-1 px-3 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/50 rounded-lg text-pink-300 font-medium text-xs transition-all"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Legacy</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </motion.button>
                      </Link>
                    )}
                    {reward.postEntrenoProgress < 100 && (
                      <Link href="/dashboard/game-changer/squads?openPostEntreno=true">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-1 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-lg text-cyan-300 font-medium text-xs transition-all"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Post-Entreno</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </motion.button>
                      </Link>
                    )}
                  </div>
                )}
                
                <button
                  onClick={() => setDismissed(true)}
                  className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                  title="Descartar"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Info adicional si no está completo */}
            {!isComplete && !claimed && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                <p className="text-slate-400 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {reward.terminoHoy 
                    ? '¡El entrenamiento termina hoy! Completa el cierre para ganar.' 
                    : reward.yaTermino 
                      ? `El entrenamiento terminó. Tienes ${7 - (Math.floor((new Date().getTime() - new Date(reward.endDate).getTime()) / (1000 * 60 * 60 * 24)))} días para completar.`
                      : `Termina en ${reward.diasRestantes} día(s)`
                  }
                </p>
                <span className="text-amber-400 text-xs font-medium flex items-center gap-1">
                  <Gift className="w-3 h-3" />
                  Recompensa: 1,000 PC + 1,000 XP
                </span>
              </div>
            )}

            {/* Lista de más recompensas pendientes */}
            {pendingRewards.length > 1 && (
              <div className="mt-2 flex gap-1">
                {pendingRewards.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 flex-1 rounded-full ${
                      index === 0 ? 'bg-purple-500' : 'bg-slate-600'
                    }`}
                  />
                ))}
                <span className="text-xs text-slate-400 ml-2">
                  +{pendingRewards.length - 1} más
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
