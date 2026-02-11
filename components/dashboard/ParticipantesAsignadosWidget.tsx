'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Eye, Camera, ScrollText, ChevronRight, Loader2 } from 'lucide-react';

interface Participante {
  id: number;
  nombre: string;
  email: string;
  cartaAutorizada?: boolean;
}

export default function ParticipantesAsignadosWidget() {
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParticipantes();
  }, []);

  const fetchParticipantes = async () => {
    try {
      const res = await fetch('/api/gamechanger/mis-participantes');
      const data = await res.json();
      if (res.ok && data.success) {
        setParticipantes(data.participantes?.slice(0, 5) || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      </div>
    );
  }

  if (participantes.length === 0) {
    return null; // No mostrar widget si no hay participantes
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Users size={24} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Mis Participantes</h3>
            <p className="text-sm text-slate-400">{participantes.length} asignado{participantes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Link 
          href="/dashboard/gamechanger/participantes"
          className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm"
        >
          Ver todos
          <ChevronRight size={16} />
        </Link>
      </div>

      {/* Lista de participantes */}
      <div className="space-y-3">
        {participantes.map((p) => (
          <div
            key={p.id}
            className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white">{p.nombre}</h4>
                <p className="text-sm text-slate-400">{p.email}</p>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Botón Ver Vault */}
                <Link
                  href={`/dashboard/gamechanger/participante/${p.id}/vault`}
                  className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400 rounded-lg transition-all"
                  title="Ver Vault"
                >
                  <Camera size={18} />
                </Link>
                
                {/* Botón Ver Carta (solo si está autorizada) */}
                {p.cartaAutorizada && (
                  <Link
                    href={`/dashboard/gamechanger/carta/${p.id}`}
                    className="p-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-400 rounded-lg transition-all"
                    title="Ver Carta"
                  >
                    <ScrollText size={18} />
                  </Link>
                )}
                
                {/* Botón Ver Perfil */}
                <Link
                  href={`/dashboard/gamechanger/participante/${p.id}`}
                  className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                  title="Ver Perfil"
                >
                  <Eye size={18} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer - Ver más */}
      {participantes.length >= 5 && (
        <Link 
          href="/dashboard/gamechanger/participantes"
          className="mt-4 block text-center py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-xl text-purple-400 font-semibold transition-all"
        >
          Ver todos los participantes
        </Link>
      )}
    </div>
  );
}
