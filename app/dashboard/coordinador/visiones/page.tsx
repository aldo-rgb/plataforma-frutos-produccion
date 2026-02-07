'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Eye,
  Loader2,
  Search,
  ArrowLeft,
  UserPlus,
  Calendar,
  Activity,
  Package,
  QrCode
} from 'lucide-react';
import Link from 'next/link';

interface ActiveProduct {
  id: number;
  name: string;
  visionId: number;
  levelType: string;
  trainingStatus: string;
}

interface Vision {
  id: number;
  nombre: string;
  descripcion: string | null;
  organizationId: number;
  maxParticipantes: number | null;
  licensesAllocated: number;
  isActive: boolean;
  createdAt: string;
  activeProducts: ActiveProduct[];
  _count: {
    Participantes: number;
    GameChangers: number;
  };
}

export default function VisionesCoordinadorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visiones, setVisiones] = useState<Vision[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (
      session?.user?.rol !== 'COORDINADOR' && 
      session?.user?.rol !== 'SCHOOL_ADMIN' &&
      session?.user?.rol !== 'COORDINATOR_BASIC' &&
      session?.user?.rol !== 'COORDINATOR_ADVANCED' &&
      session?.user?.rol !== 'TRAINER'
    ) {
      router.push('/dashboard');
    } else {
      fetchVisiones();
    }
  }, [status, session]);

  const fetchVisiones = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching visiones para coordinador...');
      const res = await fetch('/api/coordinador/visiones');
      const data = await res.json();

      console.log('📦 Respuesta del servidor:', {
        success: data.success,
        visionesCount: data.visiones?.length || 0,
        visiones: data.visiones
      });

      if (data.success) {
        setVisiones(data.visiones);
        console.log('✅ Visiones cargadas:', data.visiones.length);
      } else {
        console.error('❌ Error en la respuesta:', data);
      }
    } catch (error) {
      console.error('❌ Error fetching visiones:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVisiones = visiones.filter((vision) =>
    vision.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/coordinador"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="text-slate-400" size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Gestión de Visiones/Grupos
              </h1>
              <p className="text-slate-400">
                Visiones asignadas a tu coordinación
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/50 backdrop-blur border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-purple-400" size={24} />
              <span className="text-3xl font-bold text-purple-400">
                {visiones.length}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Visiones Activas</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Package className="text-emerald-400" size={24} />
              <span className="text-3xl font-bold text-emerald-400">
                {visiones.reduce((acc, v) => acc + v.licensesAllocated, 0)}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Licencias Asignadas</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <UserPlus className="text-blue-400" size={24} />
              <span className="text-3xl font-bold text-blue-400">
                {visiones.reduce((acc, v) => acc + v._count.Participantes + v._count.GameChangers, 0)}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Participantes Totales</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar visiones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Visiones Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVisiones.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">
                {searchTerm ? 'No se encontraron visiones' : 'No hay visiones asignadas'}
              </p>
            </div>
          ) : (
            filteredVisiones.map((vision) => (
              <div
                key={vision.id}
                className="bg-slate-900/50 backdrop-blur border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/50 transition-all"
              >
                {/* Debug: mostrar activeProducts */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-yellow-400 mb-2">
                    Debug: activeProducts = {JSON.stringify(vision.activeProducts?.length ?? 'undefined')}
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {vision.nombre}
                    </h3>
                    {vision.descripcion && vision.descripcion !== 'Visión completa generada con Vision Builder' && (
                      <p className="text-slate-400 text-sm line-clamp-2">
                        {vision.descripcion}
                      </p>
                    )}
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      vision.isActive
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {vision.isActive ? 'Activa' : 'Inactiva'}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Participantes:</span>
                    <span className="text-cyan-400 font-semibold">
                      {vision._count.Participantes} / {vision.maxParticipantes || '∞'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Game Changers:</span>
                    <span className="text-purple-400 font-semibold">
                      {vision._count.GameChangers}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Licencias Asignadas:</span>
                    <span className="text-emerald-400 font-semibold">
                      {vision.licensesAllocated}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Creada:</span>
                    <span className="text-slate-300">
                      {new Date(vision.createdAt).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>

                {/* Botones de Check-In para productos activos */}
                {vision.activeProducts && vision.activeProducts.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                      <QrCode size={14} />
                      Check-In Activo
                    </p>
                    {vision.activeProducts.map((product) => (
                      <Link
                        key={product.id}
                        href={`/staff/check-in/${product.id}`}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-sm transition-colors"
                      >
                        <QrCode size={16} />
                        Check-In {product.levelType === 'BASIC' ? 'Básico' : product.levelType === 'ADVANCED' ? 'Avanzado' : product.levelType === 'PL' ? 'Liderato' : product.name}
                      </Link>
                    ))}
                  </div>
                )}

                <Link
                  href={`/dashboard/coordinador/visiones/${vision.id}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                >
                  <Eye size={16} />
                  Ver Detalles
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
