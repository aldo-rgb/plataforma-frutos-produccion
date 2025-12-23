/**
 * ⚔️ QUANTUM ARENA - Widget de Batalla
 * Interfaz 1v1 con barras de HP, pozo de PC y provocaciones
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Trophy, Heart, Flame, Shield, Skull, Handshake } from 'lucide-react';

interface Rival {
  id: number;
  nombre: string;
  avatar?: string;
  nivel: string;
}

interface DuelData {
  id: number;
  status: string;
  escrowTotal: number;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  myHP: number;
  rivalHP: number;
  rival: Rival;
  history: Array<{
    date: string;
    myHP: number;
    rivalHP: number;
    myDamage: number;
    rivalDamage: number;
    narration?: string;
  }>;
}

export default function ArenaWidget() {
  const [duel, setDuel] = useState<DuelData | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveDuel();
  }, []);

  const fetchActiveDuel = async () => {
    try {
      const response = await fetch('/api/arena/active-duel');
      const data = await response.json();
      setDuel(data.duel);
    } catch (error) {
      console.error('Error al cargar duelo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchMatch = async () => {
    setSearching(true);
    try {
      const response = await fetch('/api/arena/search-match', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        if (data.duelId) {
          // Match encontrado inmediatamente
          await fetchActiveDuel();
        } else {
          // En cola de búsqueda
          alert(data.message);
        }
      } else {
        alert(data.error || 'Error al buscar rival');
      }
    } catch (error) {
      console.error('Error al buscar match:', error);
      alert('Error al buscar rival');
    } finally {
      setSearching(false);
    }
  };

  const handleSendTaunt = async (tauntType: string) => {
    if (!duel) return;

    try {
      const response = await fetch('/api/arena/taunt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duelId: duel.id,
          tauntType,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Mostrar feedback visual
        alert(`Provocación enviada: ${data.message}`);
      }
    } catch (error) {
      console.error('Error al enviar taunt:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 rounded-xl p-6 border border-purple-500/30">
        <p className="text-gray-400 text-center">Cargando Arena...</p>
      </div>
    );
  }

  // No hay duelo activo - Mostrar botón para buscar
  if (!duel) {
    return (
      <div className="bg-gradient-to-br from-gray-900 via-red-900/30 to-gray-900 rounded-xl p-8 border border-red-500/30">
        <div className="text-center">
          <Swords className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold text-white mb-2">🏟️ Quantum Arena</h2>
          <p className="text-gray-300 mb-6">
            Apuesta 500 PC. Enfrenta a un rival de tu nivel. El ganador se lleva todo.
          </p>

          <button
            onClick={handleSearchMatch}
            disabled={searching}
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {searching ? 'Buscando rival...' : '⚔️ Buscar Duelo (500 PC)'}
          </button>

          <p className="text-xs text-gray-500 mt-4">
            Duración: Lunes a Domingo | Gana el que complete más tareas
          </p>
        </div>
      </div>
    );
  }

  // Duelo activo - Mostrar el ring
  const myHPPercent = (duel.myHP / 100) * 100;
  const rivalHPPercent = (duel.rivalHP / 100) * 100;
  const latestUpdate = duel.history[0];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-gray-900 via-red-900/40 to-gray-900 rounded-xl p-6 border-2 border-red-500/50 shadow-2xl"
    >
      {/* Header: El Ring */}
      <div className="flex items-center justify-between mb-6">
        {/* Usuario */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-2">
            TÚ
          </div>
          <p className="text-sm text-gray-300">Tú</p>
        </div>

        {/* Pozo Central */}
        <div className="flex flex-col items-center">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="relative"
          >
            <Trophy className="w-12 h-12 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full animate-ping" />
          </motion.div>
          <p className="text-2xl font-bold text-yellow-500 mt-2">{duel.escrowTotal} PC</p>
          <p className="text-xs text-gray-400">El Pozo</p>
        </div>

        {/* Rival */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-2">
            {duel.rival.nombre.charAt(0).toUpperCase()}
          </div>
          <p className="text-sm text-gray-300">{duel.rival.nombre}</p>
        </div>
      </div>

      {/* Barras de Vida */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Mi HP */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-blue-400">Tu HP</span>
            <span className="text-lg font-bold text-white">{duel.myHP}</span>
          </div>
          <div className="h-6 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${myHPPercent}%` }}
              transition={{ duration: 0.8 }}
              className={`h-full rounded-full ${
                duel.myHP > 50
                  ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                  : duel.myHP > 25
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-400'
                  : 'bg-gradient-to-r from-red-600 to-red-500'
              }`}
            >
              <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </motion.div>
          </div>
        </div>

        {/* HP del Rival */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-red-400">Rival HP</span>
            <span className="text-lg font-bold text-white">{duel.rivalHP}</span>
          </div>
          <div className="h-6 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${rivalHPPercent}%` }}
              transition={{ duration: 0.8 }}
              className={`h-full rounded-full ${
                duel.rivalHP > 50
                  ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                  : duel.rivalHP > 25
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-400'
                  : 'bg-gradient-to-r from-red-600 to-red-500'
              }`}
            >
              <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Narración del Día */}
      {latestUpdate?.narration && (
        <div className="bg-black/30 rounded-lg p-3 mb-4 border border-purple-500/30">
          <p className="text-sm text-gray-300 italic">"{latestUpdate.narration}"</p>
        </div>
      )}

      {/* Info del Duelo */}
      <div className="flex items-center justify-between mb-4 text-sm text-gray-400">
        <span>Días restantes: {duel.daysRemaining}</span>
        <span>Nivel: {duel.rival.nivel}</span>
      </div>

      {/* Botones de Provocación (Taunts) */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => handleSendTaunt('NO_FALLO')}
          className="py-2 px-3 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 rounded-lg transition-all flex flex-col items-center gap-1"
          title="¡Hoy no fallaré!"
        >
          <Shield className="w-5 h-5 text-blue-400" />
          <span className="text-xs text-gray-300">No Fallo</span>
        </button>

        <button
          onClick={() => handleSendTaunt('ES_TODO')}
          className="py-2 px-3 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 rounded-lg transition-all flex flex-col items-center gap-1"
          title="¿Eso es todo lo que tienes?"
        >
          <Flame className="w-5 h-5 text-red-400" />
          <span className="text-xs text-gray-300">¿Es Todo?</span>
        </button>

        <button
          onClick={() => handleSendTaunt('BUEN_TRABAJO')}
          className="py-2 px-3 bg-green-600/20 hover:bg-green-600/40 border border-green-500/50 rounded-lg transition-all flex flex-col items-center gap-1"
          title="¡Buen trabajo!"
        >
          <Handshake className="w-5 h-5 text-green-400" />
          <span className="text-xs text-gray-300">GG</span>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-700 text-center">
        <p className="text-xs text-gray-500">
          🏆 El ganador se lleva {duel.escrowTotal} PC el domingo
        </p>
      </div>
    </motion.div>
  );
}
