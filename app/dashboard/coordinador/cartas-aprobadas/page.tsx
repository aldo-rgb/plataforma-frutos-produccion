'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Users, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

interface CartaAprobada {
  id: number;
  usuarioId: number;
  usuario: {
    nombre: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface VisionConCartas {
  visionId: number;
  visionNombre: string;
  cartas: CartaAprobada[];
}

export default function CartasAprobadasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visiones, setVisiones] = useState<VisionConCartas[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVision, setExpandedVision] = useState<number | null>(null);

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
      const res = await fetch('/api/coordinador/cartas-aprobadas');
      const result = await res.json();
      if (res.ok && result.success) {
        setVisiones(result.visiones);
      }
    } catch (error) {
      console.error('Error fetching cartas:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVision = (visionId: number) => {
    setExpandedVision(expandedVision === visionId ? null : visionId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <CheckCircle size={32} className="text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Cartas Aprobadas</h1>
              <p className="text-slate-400">Organizadas por visión</p>
            </div>
          </div>
        </div>

        {/* Visiones */}
        {visiones.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center">
            <CheckCircle size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">No hay cartas aprobadas</h3>
            <p className="text-slate-500">Aún no se han aprobado cartas en tus visiones</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visiones.map((vision) => (
              <div
                key={vision.visionId}
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl overflow-hidden"
              >
                {/* Vision Header */}
                <button
                  onClick={() => toggleVision(vision.visionId)}
                  className="w-full p-6 flex items-center justify-between hover:bg-slate-800/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-500/20 rounded-xl">
                      <Users size={24} className="text-green-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-white">{vision.visionNombre}</h3>
                      <p className="text-slate-400">
                        {vision.cartas.length} carta{vision.cartas.length !== 1 ? 's' : ''} aprobada{vision.cartas.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {expandedVision === vision.visionId ? (
                    <ChevronUp size={24} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={24} className="text-slate-400" />
                  )}
                </button>

                {/* Cartas List */}
                {expandedVision === vision.visionId && (
                  <div className="border-t border-slate-700 p-6 space-y-3">
                    {vision.cartas.map((carta) => (
                      <div
                        key={carta.id}
                        className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 hover:border-green-500/50 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-lg font-bold text-white mb-1">
                              {carta.usuario.nombre}
                            </h4>
                            <p className="text-sm text-slate-400">{carta.usuario.email}</p>
                          </div>
                          
                          <Link
                            href={`/dashboard/coordinador/carta/${carta.id}`}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-black rounded-lg font-bold transition-all flex items-center gap-2"
                          >
                            <Eye size={18} />
                            Ver Detalles
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
