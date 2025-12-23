'use client';

import { useState, useEffect } from 'react';
import { Search, Mail, Calendar, TrendingUp, User, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSocketEvent } from '@/hooks/useSocket';

interface Participante {
  id: number;
  nombre: string;
  email: string;
  imagen: string | null;
  progreso: number;
  estado: 'Activo' | 'Riesgo' | 'Inactivo';
  plan: string;
  ultimaSesion: string | null;
  puntosGamificacion: number;
  metasCompletadas: number;
  totalMetas: number;
}

export default function MisParticipantes() {
  const { data: session } = useSession();
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewParticipantToast, setShowNewParticipantToast] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");

  useEffect(() => {
    fetchParticipantes();
  }, []);

  // Escuchar evento de nuevo participante asignado via Socket.IO
  useSocketEvent('participant_assigned', (data: any) => {
    console.log('🔔 Nuevo participante asignado:', data);
    setNewParticipantName(data.nombre || 'Un nuevo participante');
    setShowNewParticipantToast(true);
    
    // Recargar la lista
    fetchParticipantes();
    
    // Ocultar toast después de 5 segundos
    setTimeout(() => {
      setShowNewParticipantToast(false);
    }, 5000);
  });

  const fetchParticipantes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mentor/mis-participantes');
      
      if (!response.ok) {
        throw new Error('Error al cargar participantes');
      }
      
      const data = await response.json();
      setParticipantes(data.participantes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching participantes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para filtrar por nombre o email
  const filtrados = participantes.filter(p => 
    p.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    p.email.toLowerCase().includes(filtro.toLowerCase())
  );

  // Determinar color de progreso
  const getProgresoColor = (progreso: number) => {
    if (progreso >= 70) return 'bg-green-500';
    if (progreso >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Determinar estado basado en progreso y última sesión
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Activo':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Riesgo':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'Inactivo':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando participantes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center bg-red-500/10 border border-red-500/20 rounded-xl p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-400 mb-2">Error al cargar</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={fetchParticipantes}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white">
      {/* Toast de nuevo participante */}
      {showNewParticipantToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-500/90 backdrop-blur-sm border border-green-400 rounded-lg p-4 shadow-xl animate-slideInRight">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white">Nuevo Participante Asignado</p>
              <p className="text-sm text-green-100">{newParticipantName} se ha unido a tu grupo</p>
            </div>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Mis Participantes
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Gestiona el progreso de tus {participantes.length} alumnos asignados
          </p>
        </div>
        <Link 
          href="/dashboard/mentor/asignar-participante"
          className="bg-purple-600 hover:bg-purple-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2"
        >
          <User size={18} />
          Asignar Nuevo
        </Link>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Total Participantes</p>
              <p className="text-2xl font-bold text-white mt-1">{participantes.length}</p>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <User className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Activos</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {participantes.filter(p => p.estado === 'Activo').length}
              </p>
            </div>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">En Riesgo</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                {participantes.filter(p => p.estado === 'Riesgo').length}
              </p>
            </div>
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o correo..." 
            className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-gray-300 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de Participantes */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-800/50 text-gray-400 text-sm uppercase">
              <tr>
                <th className="p-4">Participante</th>
                <th className="p-4">Progreso</th>
                <th className="p-4">Metas</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Última Sesión</th>
                <th className="p-4">Puntos</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtrados.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {p.imagen ? (
                        <img 
                          src={p.imagen} 
                          alt={p.nombre}
                          className="w-10 h-10 rounded-full border-2 border-purple-500/30"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold border-2 border-purple-500/30">
                          {p.nombre.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-white">{p.nombre}</p>
                        <p className="text-xs text-gray-500">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="w-full max-w-[140px]">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">General</span>
                        <span className="text-white font-bold">{p.progreso}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${getProgresoColor(p.progreso)}`}
                          style={{ width: `${p.progreso}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      <span className="text-white font-medium">{p.metasCompletadas}</span>
                      <span className="text-gray-500"> / {p.totalMetas}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getEstadoBadge(p.estado)}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 text-sm">
                    {p.ultimaSesion || 'Sin sesiones'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400 font-bold">{p.puntosGamificacion}</span>
                      <span className="text-xs text-gray-500">pts</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link 
                        href={`/dashboard/mentor/chat/${p.id}`}
                        title="Enviar Mensaje" 
                        className="p-2 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white transition"
                      >
                        <Mail size={18} />
                      </Link>
                      <Link 
                        href={`/dashboard/mentor/agendar/${p.id}`}
                        title="Agendar Sesión" 
                        className="p-2 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-purple-400 transition"
                      >
                        <Calendar size={18} />
                      </Link>
                      <Link 
                        href={`/dashboard/lideres/${p.id}`}
                        title="Ver Perfil Completo" 
                        className="p-2 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white transition"
                      >
                        <TrendingUp size={18} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filtrados.length === 0 && (
          <div className="p-12 text-center">
            <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {filtro ? 'No se encontraron participantes con ese criterio' : 'Aún no tienes participantes asignados'}
            </p>
          </div>
        )}
      </div>

      {/* Contador de resultados */}
      {filtrados.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Mostrando {filtrados.length} de {participantes.length} participantes
        </div>
      )}
    </div>
  );
}
