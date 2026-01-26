'use client';

import { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, ChevronRight, X, User } from 'lucide-react';

interface UserCartaStatus {
  id: number;
  nombre: string;
  email: string;
  profileImage: string | null;
  cartaId: number | null;
  estado: string;
  wizardStep: number;
  wizardCompletedAt: string | null;
  fechaActualizacion: string | null;
}

interface CartaStats {
  total: number;
  prellenadas: number;
  pendientes: number;
  porcentaje: number;
}

export default function CartaPrellenadaWidget() {
  const [stats, setStats] = useState<CartaStats | null>(null);
  const [cartasPrellenadas, setCartasPrellenadas] = useState<UserCartaStatus[]>([]);
  const [cartasPendientes, setCartasPendientes] = useState<UserCartaStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'prellenadas' | 'pendientes'>('prellenadas');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/coordinador/carta-prellenada-status');
      const data = await res.json();
      
      if (data.success) {
        setStats(data.stats);
        setCartasPrellenadas(data.cartasPrellenadas || []);
        setCartasPendientes(data.cartasPendientes || []);
      }
    } catch (error) {
      console.error('Error fetching carta prellenada status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border-2 border-emerald-500/30 rounded-2xl p-6 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="h-16 bg-slate-700 rounded w-1/2"></div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <>
      {/* Widget Principal */}
      <div 
        onClick={() => setShowModal(true)}
        className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border-2 border-emerald-500/30 rounded-2xl p-6 hover:border-emerald-500/50 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 group-hover:bg-emerald-500/30 rounded-xl transition-colors">
              <FileText size={24} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Cartas Prellenadas</h3>
              <p className="text-xs text-emerald-300">Usuarios que llegaron al paso 5</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-emerald-400/60 group-hover:text-emerald-400 transition-colors" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-black text-emerald-400">{stats.prellenadas}</p>
            <p className="text-xs text-slate-400">Prellenadas</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-yellow-400">{stats.pendientes}</p>
            <p className="text-xs text-slate-400">Pendientes</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-white">{stats.porcentaje}%</p>
            <p className="text-xs text-slate-400">Completado</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500"
            style={{ width: `${stats.porcentaje}%` }}
          />
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="text-emerald-400" />
                Estado de Cartas Prellenadas
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="text-slate-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => setModalTab('prellenadas')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  modalTab === 'prellenadas'
                    ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle className="inline mr-2" size={16} />
                Prellenadas ({stats.prellenadas})
              </button>
              <button
                onClick={() => setModalTab('pendientes')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  modalTab === 'pendientes'
                    ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-500/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="inline mr-2" size={16} />
                Pendientes ({stats.pendientes})
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {modalTab === 'prellenadas' ? (
                cartasPrellenadas.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No hay cartas prellenadas aún</p>
                ) : (
                  <div className="space-y-2">
                    {cartasPrellenadas.map((user) => (
                      <div key={user.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center overflow-hidden">
                          {user.profileImage ? (
                            <img src={user.profileImage} alt={user.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <User className="text-emerald-400" size={20} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{user.nombre}</p>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                            <CheckCircle size={12} />
                            Paso {user.wizardStep}
                          </span>
                          {user.wizardCompletedAt && (
                            <p className="text-[10px] text-slate-500 mt-1">
                              {new Date(user.wizardCompletedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                cartasPendientes.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">¡Todos completaron su carta!</p>
                ) : (
                  <div className="space-y-2">
                    {cartasPendientes.map((user) => (
                      <div key={user.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center overflow-hidden">
                          {user.profileImage ? (
                            <img src={user.profileImage} alt={user.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <User className="text-yellow-400" size={20} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{user.nombre}</p>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                            <Clock size={12} />
                            {user.wizardStep === 0 ? 'Sin iniciar' : `Paso ${user.wizardStep}/5`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
