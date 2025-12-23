'use client';

import React, { useState, useEffect } from 'react';
import { FileText, User, Calendar, CheckCircle, Eye, ArrowLeft, Filter, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CartaPendiente {
  id: number;
  estado: string;
  submittedAt: string | null;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    telefono: string | null;
    vision: {
      id: number;
      name: string;
      endDate: string;
    } | null;
  };
  areas: Array<{
    type: string;
    identity: string;
    meta: string;
    hasActions: boolean;
  }>;
  completeness: number;
}

interface CartaStats {
  cartas: CartaPendiente[];
  total: number;
}

export default function CartasListPage() {
  const router = useRouter();
  const [stats, setStats] = useState<CartaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVision, setFilterVision] = useState<string>('all');

  useEffect(() => {
    loadPendingCartas();
  }, []);

  const loadPendingCartas = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/mentor/pending-cartas');
      
      if (!response.ok) {
        throw new Error('Error al cargar cartas pendientes');
      }

      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error('Error loading cartas:', err);
      setError(err.message || 'Error al cargar cartas');
    } finally {
      setLoading(false);
    }
  };

  const getAreaLabel = (type: string) => {
    const labels: Record<string, string> = {
      FINANZAS: '💰 Finanzas',
      RELACIONES: '❤️ Relaciones',
      TALENTOS: '🎯 Talentos',
      SALUD: '💪 Salud',
      PAZ_MENTAL: '🧘 Paz Mental',
      OCIO: '🎮 Ocio',
      SERVICIO_TRANS: '🌟 Servicio Trans.',
      SERVICIO_COMUN: '🤝 Servicio Com.'
    };
    return labels[type] || type;
  };

  const filteredCartas = stats?.cartas.filter(carta => {
    const matchesSearch = carta.usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         carta.usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVision = filterVision === 'all' || 
                         (filterVision === 'solo' && !carta.usuario.vision) ||
                         (filterVision === 'vision' && carta.usuario.vision);
    return matchesSearch && matchesVision;
  }) || [];

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/dashboard/mentor"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Dashboard
        </Link>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-900/50 text-purple-400 rounded-xl">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white italic tracking-wide">
                CARTAS <span className="text-purple-400">F.R.U.T.O.S.</span>
              </h1>
              <p className="text-slate-400 mt-1">Revisión de metas y declaraciones de identidad</p>
            </div>
          </div>
          
          {stats && stats.total > 0 && (
            <div className="bg-purple-500/20 border border-purple-500 text-purple-300 px-6 py-3 rounded-full text-lg font-bold">
              {stats.total} pendientes
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        
        {/* Vision Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={filterVision}
            onChange={(e) => setFilterVision(e.target.value)}
            className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="all">Todos los ciclos</option>
            <option value="solo">🐺 Solo (100 días)</option>
            <option value="vision">🌟 Visión (Grupal)</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
          <span className="ml-4 text-purple-300 text-lg">Cargando cartas pendientes...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 p-6 rounded-xl">
          <h3 className="text-red-300 font-bold text-lg mb-2">Error al cargar cartas</h3>
          <p className="text-red-400">{error}</p>
          <button 
            onClick={loadPendingCartas}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredCartas.length === 0 && (
        <div className="text-center py-20">
          <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
          <h3 className="text-white text-2xl font-bold mb-2">¡Todo al día!</h3>
          <p className="text-slate-400">
            {searchTerm || filterVision !== 'all' 
              ? 'No se encontraron cartas con los filtros aplicados' 
              : 'No hay cartas pendientes de revisión'}
          </p>
        </div>
      )}

      {/* Cartas Grid */}
      {!loading && !error && filteredCartas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCartas.map((carta) => (
            <div 
              key={carta.id}
              className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6 hover:border-purple-500 transition-all hover:shadow-xl hover:shadow-purple-900/20"
            >
              {/* User Info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-900/30 rounded-lg">
                    <User className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">{carta.usuario.nombre}</h4>
                    <p className="text-slate-400 text-sm">{carta.usuario.email}</p>
                  </div>
                </div>
              </div>

              {/* Vision Badge */}
              {carta.usuario.vision ? (
                <span className="inline-block mb-3 px-3 py-1 bg-purple-900/30 border border-purple-600 text-purple-300 text-sm rounded-full">
                  🌟 {carta.usuario.vision.name}
                </span>
              ) : (
                <span className="inline-block mb-3 px-3 py-1 bg-gray-900/30 border border-gray-600 text-gray-300 text-sm rounded-full">
                  🐺 Ciclo Personal
                </span>
              )}

              {/* Completeness Badge */}
              <div className={`mb-4 px-4 py-2 rounded-lg text-center ${
                carta.completeness >= 80 
                  ? 'bg-green-900/30 border border-green-600'
                  : carta.completeness >= 50
                  ? 'bg-yellow-900/30 border border-yellow-600'
                  : 'bg-red-900/30 border border-red-600'
              }`}>
                <div className={`text-3xl font-bold mb-1 ${
                  carta.completeness >= 80 
                    ? 'text-green-300'
                    : carta.completeness >= 50
                    ? 'text-yellow-300'
                    : 'text-red-300'
                }`}>
                  {carta.completeness}%
                </div>
                <div className="text-xs text-slate-400">Completado</div>
              </div>

              {/* Submission Date */}
              {carta.submittedAt && (
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(carta.submittedAt).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}

              {/* Areas Preview */}
              <div className="flex flex-wrap gap-2 mb-4">
                {carta.areas
                  .filter(area => area.identity || area.meta)
                  .slice(0, 3)
                  .map((area, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-1 bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded"
                    >
                      {getAreaLabel(area.type).split(' ')[0]}
                      {area.hasActions && <span className="ml-1 text-green-400">✓</span>}
                    </span>
                  ))}
                {carta.areas.filter(a => a.identity || a.meta).length > 3 && (
                  <span className="px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded">
                    +{carta.areas.filter(a => a.identity || a.meta).length - 3}
                  </span>
                )}
              </div>

              {/* Action Button */}
              <Link 
                href={`/dashboard/mentor/cartas/${carta.id}/review`}
                className="block w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-lg text-center transition-all flex items-center justify-center gap-2"
              >
                <Eye className="w-5 h-5" />
                Revisar Carta
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
