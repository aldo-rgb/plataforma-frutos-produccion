'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, User, Phone, Eye } from 'lucide-react';
import Link from 'next/link';

interface UsuarioRiesgo {
  id: number;
  nombre: string;
  email: string;
  llamadasPerdidas: number;
  strikes: number;
}

export default function UsuariosEnRiesgoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioRiesgo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'COORDINADOR') {
      router.push('/dashboard');
    } else {
      fetchUsuarios();
    }
  }, [status, session]);

  const fetchUsuarios = async () => {
    try {
      const res = await fetch('/api/coordinador/usuarios-riesgo');
      const result = await res.json();
      if (res.ok && result.success) {
        setUsuarios(result.usuarios);
      }
    } catch (error) {
      console.error('Error fetching usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-orange-500/20 rounded-xl">
              <Shield size={32} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Participantes en Riesgo</h1>
              <p className="text-slate-400">Con 2 o más llamadas perdidas en disciplina</p>
            </div>
          </div>
        </div>

        {/* Lista de usuarios */}
        {usuarios.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center">
            <Shield size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">No hay usuarios en riesgo</h3>
            <p className="text-slate-500">¡Excelente! Todos los participantes están cumpliendo</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {usuarios.map((usuario) => (
              <div
                key={usuario.id}
                className="bg-gradient-to-br from-orange-900/20 to-slate-900/50 border-2 border-orange-500/30 rounded-2xl p-6 hover:border-orange-500/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 bg-orange-500/20 rounded-xl">
                      <User size={24} className="text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">
                        {usuario.nombre}
                      </h3>
                      <p className="text-sm text-slate-400 mb-2">{usuario.email}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone size={16} className="text-orange-400" />
                          <span className="text-orange-300 font-bold">
                            {usuario.llamadasPerdidas} llamada{usuario.llamadasPerdidas !== 1 ? 's' : ''} perdida{usuario.llamadasPerdidas !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Shield size={16} className="text-slate-400" />
                          <span className="text-slate-400">
                            Strikes: {usuario.strikes}/3
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Link
                    href={`/dashboard/coordinador/participante/${usuario.id}`}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-all flex items-center gap-2"
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
