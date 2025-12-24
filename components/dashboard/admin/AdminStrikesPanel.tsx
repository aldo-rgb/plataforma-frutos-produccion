'use client';

import { useState, useEffect } from 'react';
import { Heart, Search, AlertTriangle, RefreshCw, Gift, Shield } from 'lucide-react';

interface Participante {
  id: number;
  nombre: string;
  email: string;
  profileImage: string | null;
  enrollment: {
    id: number;
    missedCallsCount: number;
    maxMissedAllowed: number;
    status: string;
    extraLifeUsed?: boolean;
    extraLifeGrantedBy?: string;
    extraLifeGrantedAt?: string;
  };
  mentor: {
    nombre: string;
    email: string;
  } | null;
}

export default function AdminStrikesPanel() {
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'peligro' | 'suspendidos'>('todos');

  useEffect(() => {
    cargarParticipantes();
  }, []);

  const cargarParticipantes = async () => {
    try {
      const res = await fetch('/api/admin/participantes-strikes');
      const data = await res.json();
      
      if (data.success) {
        setParticipantes(data.participantes);
      }
    } catch (error) {
      console.error('Error cargando participantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const otorgarVidaExtra = async (enrollmentId: number, nombre: string) => {
    const razon = prompt(`¿Por qué otorgas una vida extra a ${nombre}?\n(Opcional - presiona Enter para continuar sin razón)`);
    
    if (razon === null) return; // Usuario canceló

    setProcesando(enrollmentId);

    try {
      const res = await fetch('/api/admin/extra-life', {
        method: 'POST',
        body: JSON.stringify({ enrollmentId, razon }),
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ ${data.message}\n\n${data.wasReactivated ? 'El estudiante ha sido reactivado.' : 'Strikes reseteados a 0.'}`);
        await cargarParticipantes();
      } else {
        alert(data.error || 'Error al otorgar vida extra');
      }
    } catch (error) {
      console.error('Error otorgando vida extra:', error);
      alert('Error al otorgar vida extra. Intenta nuevamente.');
    } finally {
      setProcesando(null);
    }
  };

  const participantesFiltrados = participantes.filter(p => {
    const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                         p.email.toLowerCase().includes(busqueda.toLowerCase());
    
    if (!matchBusqueda) return false;

    const vidasRestantes = p.enrollment.maxMissedAllowed - p.enrollment.missedCallsCount;
    const enPeligro = vidasRestantes <= 1 && p.enrollment.status !== 'SUSPENDED';
    const suspendido = p.enrollment.status === 'SUSPENDED';

    if (filtro === 'peligro') return enPeligro;
    if (filtro === 'suspendidos') return suspendido;
    return true;
  });

  if (loading) {
    return (
      <div className="bg-[#0f111a] border border-gray-800 rounded-xl h-96 animate-pulse">
        <div className="p-4 bg-[#151725] h-16"></div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-800 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f111a] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
      {/* HEADER */}
      <div className="p-4 border-b border-gray-800 bg-[#151725]">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="text-blue-500" size={20} />
              Panel de Administración de Strikes
            </h3>
            <p className="text-xs text-gray-400">
              Gestión de faltas y vidas extra para todos los participantes
            </p>
          </div>
          <button
            onClick={cargarParticipantes}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* FILTROS Y BUSQUEDA */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0f111a] border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-purple-500 focus:outline-none"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFiltro('todos')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filtro === 'todos' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Todos ({participantes.length})
            </button>
            <button
              onClick={() => setFiltro('peligro')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filtro === 'peligro' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              En Peligro ({participantes.filter(p => {
                const vidas = p.enrollment.maxMissedAllowed - p.enrollment.missedCallsCount;
                return vidas <= 1 && p.enrollment.status !== 'SUSPENDED';
              }).length})
            </button>
            <button
              onClick={() => setFiltro('suspendidos')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filtro === 'suspendidos' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Suspendidos ({participantes.filter(p => p.enrollment.status === 'SUSPENDED').length})
            </button>
          </div>
        </div>
      </div>

      {/* LISTA DE PARTICIPANTES */}
      <div className="divide-y divide-gray-800 max-h-[600px] overflow-y-auto">
        {participantesFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <AlertTriangle className="mx-auto mb-2 opacity-50 w-12 h-12" />
            <p className="font-medium">Sin resultados</p>
            <p className="text-sm">No se encontraron participantes con los filtros seleccionados.</p>
          </div>
        ) : (
          participantesFiltrados.map((participante) => {
            const vidasRestantes = participante.enrollment.maxMissedAllowed - participante.enrollment.missedCallsCount;
            const enPeligro = vidasRestantes <= 1;
            const suspendido = participante.enrollment.status === 'SUSPENDED';

            return (
              <div 
                key={participante.id} 
                className={`p-4 hover:bg-[#1a1d2d] transition-colors ${
                  suspendido ? 'bg-red-900/10 border-l-4 border-red-500' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  
                  {/* INFO PARTICIPANTE */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative">
                      {participante.profileImage ? (
                        <img 
                          src={participante.profileImage} 
                          alt={participante.nombre} 
                          className="w-12 h-12 rounded-full border-2 border-gray-600 object-cover" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          {participante.nombre.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      {suspendido && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0f111a]">
                          ⛔
                        </div>
                      )}
                      
                      {enPeligro && !suspendido && (
                        <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse border-2 border-[#0f111a]">
                          <AlertTriangle size={12} />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-200 text-sm truncate flex items-center gap-2">
                        {participante.nombre}
                        {suspendido && (
                          <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                            SUSPENDIDO
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-gray-500 truncate">{participante.email}</p>
                      {participante.mentor && (
                        <p className="text-xs text-gray-600 truncate">
                          Mentor: {participante.mentor.nombre}
                        </p>
                      )}
                      
                      {/* Sistema de Vidas */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex gap-1" title={`${vidasRestantes} vidas restantes de ${participante.enrollment.maxMissedAllowed}`}>
                          {[...Array(participante.enrollment.maxMissedAllowed)].map((_, i) => (
                            <Heart 
                              key={i} 
                              size={14}
                              className={i < vidasRestantes ? 'text-red-500 fill-red-500' : 'text-gray-600'} 
                            />
                          ))}
                        </div>
                        <span className={`text-xs font-bold ${
                          suspendido ? 'text-red-500' : enPeligro ? 'text-orange-400' : 'text-gray-400'
                        }`}>
                          {vidasRestantes}/{participante.enrollment.maxMissedAllowed}
                        </span>
                        
                        {participante.enrollment.missedCallsCount > 0 && (
                          <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                            {participante.enrollment.missedCallsCount} {participante.enrollment.missedCallsCount === 1 ? 'falta' : 'faltas'}
                          </span>
                        )}
                        
                        {participante.enrollment.extraLifeUsed && (
                          <span className="text-xs bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1">
                            <Gift size={10} />
                            Vida usada ({
                              participante.enrollment.extraLifeGrantedBy === 'COORDINADOR' ? 'Coordinador' :
                              participante.enrollment.extraLifeGrantedBy === 'DIRECTOR' ? 'Director' :
                              participante.enrollment.extraLifeGrantedBy === 'ADMIN' ? 'Admin' :
                              'Comprada'
                            })
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ACCION: OTORGAR VIDA */}
                  <button
                    onClick={() => otorgarVidaExtra(participante.enrollment.id, participante.nombre)}
                    disabled={procesando === participante.enrollment.id || participante.enrollment.extraLifeUsed}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-2 whitespace-nowrap"
                    title={
                      participante.enrollment.extraLifeUsed 
                        ? 'Ya utilizó su única vida extra disponible' 
                        : suspendido ? 'Reactivar y otorgar vida extra' : 'Otorgar vida extra (resetea strikes a 0)'
                    }
                  >
                    <Gift size={14} />
                    {participante.enrollment.extraLifeUsed ? 'Vida Usada' : suspendido ? 'Reactivar' : 'Otorgar Vida'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
