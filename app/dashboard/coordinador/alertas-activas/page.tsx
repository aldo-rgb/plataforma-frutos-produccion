'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, User, Calendar, Eye } from 'lucide-react';
import Link from 'next/link';

interface AlertaActiva {
  usuarioId: number;
  usuario: {
    nombre: string;
    email: string;
  };
  tareasPostergadas: number;
  diasMaxPostergacion: number;
}

export default function AlertasActivasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [alertas, setAlertas] = useState<AlertaActiva[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'COORDINADOR') {
      router.push('/dashboard');
    } else {
      fetchAlertas();
    }
  }, [status, session]);

  const fetchAlertas = async () => {
    try {
      const res = await fetch('/api/coordinador/alertas-activas');
      const result = await res.json();
      if (res.ok && result.success) {
        setAlertas(result.alertas);
      }
    } catch (error) {
      console.error('Error fetching alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-red-500/20 rounded-xl">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Alertas Activas</h1>
              <p className="text-slate-400">Participantes con tareas postergadas +30 días</p>
            </div>
          </div>
        </div>

        {/* Lista de alertas */}
        {alertas.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center">
            <AlertTriangle size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">No hay alertas activas</h3>
            <p className="text-slate-500">¡Excelente! Todos los participantes están al día</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {alertas.map((alerta) => (
              <div
                key={alerta.usuarioId}
                className="bg-gradient-to-br from-red-900/20 to-slate-900/50 border-2 border-red-500/30 rounded-2xl p-6 hover:border-red-500/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 bg-red-500/20 rounded-xl">
                      <User size={24} className="text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">
                        {alerta.usuario.nombre}
                      </h3>
                      <p className="text-sm text-slate-400 mb-2">{alerta.usuario.email}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-red-400" />
                          <span className="text-red-300 font-bold">
                            {alerta.tareasPostergadas} tarea{alerta.tareasPostergadas !== 1 ? 's' : ''} postergada{alerta.tareasPostergadas !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-slate-400">
                          Máximo: {alerta.diasMaxPostergacion} días de retraso
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Link
                    href={`/dashboard/coordinador/participante/${alerta.usuarioId}`}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-all flex items-center gap-2"
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
    </div>
  );
}
