'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FileText, Clock, User, Eye, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface CartaPendiente {
  id: number;
  usuarioId: number;
  usuario: {
    nombre: string;
    email: string;
  };
  mentor: {
    nombre: string;
    email: string;
  } | null;
  estado: string;
  createdAt: string;
  updatedAt: string;
}

export default function CartasPendientesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cartas, setCartas] = useState<CartaPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'BORRADOR' | 'EN_REVISION'>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'COORDINADOR') {
      router.push('/dashboard');
    } else {
      fetchCartas();
    }
  }, [status, session]);

  const fetchCartas = async () => {
    try {
      const res = await fetch('/api/coordinador/cartas-pendientes');
      const result = await res.json();
      if (res.ok && result.success) {
        setCartas(result.cartas);
      }
    } catch (error) {
      console.error('Error fetching cartas:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCartas = filter === 'all' 
    ? cartas 
    : cartas.filter(c => c.estado === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-yellow-500/20 rounded-xl">
              <FileText size={32} className="text-yellow-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Cartas Pendientes</h1>
              <p className="text-slate-400">Participantes sin carta autorizada</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-yellow-500 text-black'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Todas ({cartas.length})
          </button>
          <button
            onClick={() => setFilter('BORRADOR')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'BORRADOR'
                ? 'bg-yellow-500 text-black'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Borrador ({cartas.filter(c => c.estado === 'BORRADOR').length})
          </button>
          <button
            onClick={() => setFilter('EN_REVISION')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'EN_REVISION'
                ? 'bg-yellow-500 text-black'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            En Revisión ({cartas.filter(c => c.estado === 'EN_REVISION').length})
          </button>
        </div>

        {/* Lista de cartas */}
        {filteredCartas.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center">
            <AlertCircle size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">No hay cartas pendientes</h3>
            <p className="text-slate-500">No se encontraron cartas con el filtro seleccionado</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCartas.map((carta) => (
              <div
                key={carta.id}
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-6 hover:border-yellow-500/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 bg-yellow-500/20 rounded-xl">
                      <User size={24} className="text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">
                        {carta.usuario.nombre}
                      </h3>
                      <p className="text-sm text-slate-400 mb-2">{carta.usuario.email}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-slate-500" />
                          <span className="text-slate-400">
                            Actualizado: {new Date(carta.updatedAt).toLocaleDateString('es-MX')}
                          </span>
                        </div>
                        {carta.mentor && (
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-slate-500" />
                            <span className="text-slate-400">
                              Mentor: {carta.mentor.nombre}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 rounded-lg font-bold ${
                      carta.estado === 'BORRADOR'
                        ? 'bg-slate-700 text-slate-300'
                        : carta.estado === 'EN_REVISION'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                    }`}>
                      {carta.estado === 'BORRADOR' ? 'Borrador' : 
                       carta.estado === 'EN_REVISION' ? 'En Revisión' : carta.estado}
                    </div>
                    
                    <Link
                      href={`/dashboard/coordinador/carta/${carta.id}`}
                      className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-bold transition-all flex items-center gap-2"
                    >
                      <Eye size={18} />
                      Ver Carta
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
