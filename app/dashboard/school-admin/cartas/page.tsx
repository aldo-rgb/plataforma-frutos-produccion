'use client';

import { useState, useEffect } from 'react';
import { FileText, Eye, Search, Filter, Download, CheckCircle, XCircle, Clock, AlertCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface CartaTracking {
  id: number;
  nombre: string;
  email: string;
  fechaRegistro: string;
  vision: {
    id: number;
    nombre: string;
  } | null;
  license: {
    tier: string;
    activada: boolean;
    fechaActivacion: string | null;
    expira: string | null;
  } | null;
  carta: {
    id: number;
    estado: string;
    fechaCreacion: string;
    fechaActualizacion: string;
    fechaEnvio: string | null;
    totalMetas: number;
    reviewStats: {
      total: number;
      aprobadas: number;
      rechazadas: number;
      pendientes: number;
      porcentajeAprobacion: number;
    } | null;
  } | null;
  wizardCompleted: boolean;
  statusResumen: {
    tipo: string;
    mensaje: string;
    color: string;
  };
}

export default function CartasTrackingPage() {
  const [cartas, setCartas] = useState<CartaTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterVision, setFilterVision] = useState<string>('todas');

  useEffect(() => {
    fetchCartas();
  }, []);

  const fetchCartas = async () => {
    try {
      const res = await fetch('/api/school-admin/cartas-tracking');
      const data = await res.json();
      if (data.success) {
        setCartas(data.cartas);
      }
    } catch (error) {
      console.error('Error fetching cartas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar cartas
  const cartasFiltradas = cartas.filter(carta => {
    const matchSearch = 
      carta.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carta.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = filterStatus === 'todos' || carta.statusResumen.tipo === filterStatus;
    const matchVision = filterVision === 'todas' || 
      (filterVision === 'sin-vision' && !carta.vision) ||
      (carta.vision?.nombre === filterVision);

    return matchSearch && matchStatus && matchVision;
  });

  // Obtener visiones únicas
  const visiones = Array.from(new Set(cartas.map(c => c.vision?.nombre).filter(Boolean)));

  // Estadísticas generales
  const stats = {
    total: cartas.length,
    sinCarta: cartas.filter(c => !c.carta).length,
    borradores: cartas.filter(c => c.carta?.estado === 'BORRADOR').length,
    enRevision: cartas.filter(c => c.carta?.estado === 'EN_REVISION').length,
    cambiosRequeridos: cartas.filter(c => c.carta?.estado === 'CAMBIOS_REQUERIDOS').length,
    aprobadas: cartas.filter(c => c.carta?.estado === 'APROBADA').length,
  };

  const getStatusColor = (color: string) => {
    const colors: Record<string, string> = {
      gray: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      green: 'bg-green-500/20 text-green-300 border-green-500/30',
    };
    return colors[color] || colors.gray;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando seguimiento de cartas...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText size={32} className="text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Seguimiento de Cartas F.R.U.T.O.S.</h1>
          </div>
          <p className="text-slate-300">Monitorea el progreso de las cartas de tus participantes</p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">Total</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">Sin Carta</div>
            <div className="text-2xl font-bold text-gray-400">{stats.sinCarta}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">Borradores</div>
            <div className="text-2xl font-bold text-blue-400">{stats.borradores}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">En Revisión</div>
            <div className="text-2xl font-bold text-purple-400">{stats.enRevision}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">C. Requeridos</div>
            <div className="text-2xl font-bold text-orange-400">{stats.cambiosRequeridos}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">Aprobadas</div>
            <div className="text-2xl font-bold text-green-400">{stats.aprobadas}</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Filtro por estado */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="sin-carta">Sin carta</option>
              <option value="borrador">Borradores</option>
              <option value="en-revision">En revisión</option>
              <option value="cambios-requeridos">Cambios requeridos</option>
              <option value="aprobada">Aprobadas</option>
              <option value="licencia-no-activada">Licencia no activada</option>
            </select>

            {/* Filtro por visión */}
            <select
              value={filterVision}
              onChange={(e) => setFilterVision(e.target.value)}
              className="px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="todas">Todas las visiones</option>
              <option value="sin-vision">Sin visión</option>
              {visiones.map(vision => (
                <option key={vision} value={vision}>{vision}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla de cartas */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Usuario</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Visión</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Estado</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Progreso</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Última Act.</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {cartasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No se encontraron cartas con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  cartasFiltradas.map((carta) => (
                    <tr key={carta.id} className="hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{carta.nombre}</div>
                        <div className="text-slate-400 text-sm">{carta.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {carta.vision ? (
                          <span className="text-purple-300">{carta.vision.nombre}</span>
                        ) : (
                          <span className="text-slate-500">Sin visión</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(carta.statusResumen.color)}`}>
                          {carta.statusResumen.mensaje}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {carta.carta?.reviewStats ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500"
                                  style={{ width: `${carta.carta.reviewStats.porcentajeAprobacion}%` }}
                                />
                              </div>
                              <span className="text-slate-300 text-xs w-12">{carta.carta.reviewStats.porcentajeAprobacion}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <CheckCircle size={12} className="text-green-400" />
                                {carta.carta.reviewStats.aprobadas}
                              </span>
                              <span className="flex items-center gap-1">
                                <XCircle size={12} className="text-red-400" />
                                {carta.carta.reviewStats.rechazadas}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} className="text-yellow-400" />
                                {carta.carta.reviewStats.pendientes}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">Sin datos</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm">
                        {carta.carta?.fechaActualizacion 
                          ? new Date(carta.carta.fechaActualizacion).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '-'
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        {carta.carta ? (
                          <Link
                            href={`/dashboard/school-admin/cartas/${carta.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition"
                          >
                            <Eye size={16} />
                            Ver Carta
                          </Link>
                        ) : (
                          <span className="text-slate-500 text-sm">Sin carta</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-slate-400 text-sm">
          Mostrando {cartasFiltradas.length} de {cartas.length} participantes
        </div>
      </div>
    </div>
  );
}
