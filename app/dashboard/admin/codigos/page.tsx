'use client';

import { useState, useEffect } from 'react';
import { Gift, Copy, Plus, RefreshCw, CheckCircle2, Ticket, Calendar, Building2, Users, UserCheck, Video, Trash2, Phone } from 'lucide-react';

type CodigoTipo = 'MEMBRESIA_MENTOR' | 'MEMBRESIA_STANDARD' | 'MEMBRESIA_PREMIUM' | 'MENTORIA_1_1' | 'LICENCIAS_INSTITUCIONAL' | 'PAQUETE_LLAMADAS';
type CodigoEstado = 'DISPONIBLE' | 'CANJEADO' | 'EXPIRADO';

interface Codigo {
  id: number;
  codigo: string;
  tipo: CodigoTipo;
  estado: CodigoEstado;
  creado: string;
  usuario?: string;
  cantidadLicencias?: number;
  licenciasUsadas?: number;
  cantidadLlamadas?: number;
  llamadasUsadas?: number;
  descripcion?: string;
}

export default function GeneradorCodigosPage() {
  const [codigos, setCodigos] = useState<Codigo[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoNuevo, setTipoNuevo] = useState<CodigoTipo>('MEMBRESIA_STANDARD');
  const [cantidad, setCantidad] = useState(1);
  const [cantidadLicencias, setCantidadLicencias] = useState(100);
  const [cantidadLlamadas, setCantidadLlamadas] = useState(18);
  const [descripcion, setDescripcion] = useState('');
  const [generando, setGenerando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  // Cargar códigos desde la API
  useEffect(() => {
    cargarCodigos();
  }, []);

  const cargarCodigos = async () => {
    try {
      const res = await fetch('/api/admin/codigos');
      if (res.ok) {
        const data = await res.json();
        setCodigos(data.codigos || []);
      }
    } catch (error) {
      console.error('Error cargando códigos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para generar string aleatorio
  const generarString = (length: number = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const getPrefijoPorTipo = (tipo: CodigoTipo): string => {
    switch (tipo) {
      case 'MEMBRESIA_MENTOR': return 'MENTOR';
      case 'MEMBRESIA_STANDARD': return 'STD';
      case 'MEMBRESIA_PREMIUM': return 'PREMIUM';
      case 'MENTORIA_1_1': return 'M11';
      case 'LICENCIAS_INSTITUCIONAL': return 'INST';
      case 'PAQUETE_LLAMADAS': return 'CALLS';
      default: return 'CODE';
    }
  };

  const handleGenerar = async () => {
    setGenerando(true);
    try {
      const codigosNuevos = [];
      
      for (let i = 0; i < cantidad; i++) {
        const prefijo = getPrefijoPorTipo(tipoNuevo);
        const codigo = `${prefijo}-${generarString(6)}`;
        
        codigosNuevos.push({
          codigo,
          tipo: tipoNuevo,
          cantidadLicencias: tipoNuevo === 'LICENCIAS_INSTITUCIONAL' ? cantidadLicencias : undefined,
          cantidadLlamadas: tipoNuevo === 'PAQUETE_LLAMADAS' ? cantidadLlamadas : undefined,
          descripcion: descripcion.trim() || undefined,
        });
      }

      const res = await fetch('/api/admin/codigos/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigos: codigosNuevos }),
      });

      if (res.ok) {
        await cargarCodigos();
        setDescripcion('');
      } else {
        alert('Error al generar códigos');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar códigos');
    } finally {
      setGenerando(false);
    }
  };

  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiado(codigo);
    setTimeout(() => setCopiado(null), 2000);
  };

  const eliminarCodigo = async (id: number) => {
    if (!confirm('¿Eliminar este código?')) return;
    
    try {
      const res = await fetch(`/api/admin/codigos/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        await cargarCodigos();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getTipoLabel = (tipo: CodigoTipo): string => {
    switch (tipo) {
      case 'MEMBRESIA_MENTOR': return '👨‍🏫 Membresía Mentor';
      case 'MEMBRESIA_STANDARD': return '⭐ Membresía Standard';
      case 'MEMBRESIA_PREMIUM': return '💎 Membresía Premium';
      case 'MENTORIA_1_1': return '🎯 Mentoría 1:1';
      case 'LICENCIAS_INSTITUCIONAL': return '🏢 Licencias Institucional';
      case 'PAQUETE_LLAMADAS': return '📞 Paquete Llamadas';
      default: return tipo;
    }
  };

  const getTipoIcon = (tipo: CodigoTipo) => {
    switch (tipo) {
      case 'MEMBRESIA_MENTOR': return <UserCheck size={18} className="text-purple-400" />;
      case 'MEMBRESIA_STANDARD': return <Users size={18} className="text-blue-400" />;
      case 'MEMBRESIA_PREMIUM': return <Gift size={18} className="text-yellow-400" />;
      case 'MENTORIA_1_1': return <Video size={18} className="text-green-400" />;
      case 'LICENCIAS_INSTITUCIONAL': return <Building2 size={18} className="text-cyan-400" />;
      case 'PAQUETE_LLAMADAS': return <Phone size={18} className="text-pink-400" />;
      default: return <Ticket size={18} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="animate-spin text-purple-400" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Gift className="text-yellow-500" size={32} />
          Generador de Códigos
        </h1>
        <p className="text-slate-400">Crea códigos de acceso para membresías, mentorías y licencias institucionales.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* PANEL DE CREACIÓN */}
        <div className="lg:col-span-1">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-6 border-b border-slate-800 pb-2">Generar Códigos</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tipo de Código</label>
                        <select 
                            value={tipoNuevo}
                            onChange={(e) => setTipoNuevo(e.target.value as CodigoTipo)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none"
                        >
                            <option value="MEMBRESIA_STANDARD">⭐ Membresía Standard</option>
                            <option value="MEMBRESIA_PREMIUM">💎 Membresía Premium</option>
                            <option value="MEMBRESIA_MENTOR">👨‍🏫 Membresía Mentor</option>
                            <option value="MENTORIA_1_1">🎯 Mentoría 1:1</option>
                            <option value="LICENCIAS_INSTITUCIONAL">🏢 Licencias Institucional</option>
                            <option value="PAQUETE_LLAMADAS">📞 Paquete Llamadas</option>
                        </select>
                    </div>

                    {tipoNuevo === 'LICENCIAS_INSTITUCIONAL' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Cantidad de Licencias</label>
                        <input 
                          type="number" 
                          min="100" 
                          step="10"
                          value={cantidadLicencias}
                          onChange={(e) => setCantidadLicencias(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                          placeholder="Ej: 50"
                        />
                        <p className="text-xs text-slate-500 mt-1">Mínimo 50 licencias</p>
                      </div>
                    )}

                    {tipoNuevo === 'PAQUETE_LLAMADAS' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Cantidad de Llamadas</label>
                        <input 
                          type="number" 
                          min="1" 
                          step="1"
                          value={cantidadLlamadas}
                          onChange={(e) => setCantidadLlamadas(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                          placeholder="Ej: 18"
                        />
                        <p className="text-xs text-slate-500 mt-1">Número de llamadas incluidas en el código</p>
                      </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Descripción (Opcional)</label>
                        <input 
                          type="text"
                          value={descripcion}
                          onChange={(e) => setDescripcion(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                          placeholder="Ej: Promoción Enero 2026"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Cantidad de Códigos</label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="number" min="1" max="50"
                                value={cantidad}
                                onChange={(e) => setCantidad(Number(e.target.value))}
                                className="w-20 bg-slate-950 border border-slate-700 rounded-lg p-3 text-center text-white font-bold"
                            />
                            <span className="text-sm text-slate-500">códigos únicos</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerar}
                        disabled={generando}
                        className="w-full mt-4 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        {generando ? <RefreshCw className="animate-spin" size={20}/> : <Plus size={20}/>}
                        {generando ? 'Generando...' : 'Crear Códigos'}
                    </button>
                </div>
            </div>

            {/* Stats Rápidos */}
            <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <p className="text-slate-500 text-xs font-bold uppercase">Disponibles</p>
                    <p className="text-3xl font-bold text-emerald-400">{codigos.filter(c => c.estado === 'DISPONIBLE').length}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <p className="text-slate-500 text-xs font-bold uppercase">Canjeados</p>
                    <p className="text-3xl font-bold text-slate-200">{codigos.filter(c => c.estado === 'CANJEADO').length}</p>
                </div>
            </div>
        </div>

        {/* TABLA DE CÓDIGOS */}
        <div className="lg:col-span-2">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-slate-300 font-bold flex items-center gap-2"><Ticket size={18}/> Códigos Generados ({codigos.length})</h3>
                </div>
                
                <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-900 text-xs uppercase text-slate-500 font-bold">
                            <tr>
                                <th className="p-4">Código</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Info</th>
                                <th className="p-4">Creado</th>
                                <th className="p-4">Estado</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm">
                            {codigos.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500">
                                  No hay códigos generados aún
                                </td>
                              </tr>
                            ) : (
                              codigos.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-800/50">
                                    <td className="p-4">
                                        <div className="font-mono font-bold text-white tracking-wider">{item.codigo}</div>
                                        {item.descripcion && (
                                          <div className="text-xs text-slate-500 mt-1">{item.descripcion}</div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                      <div className="flex items-center gap-2">
                                        {getTipoIcon(item.tipo)}
                                        <span className="text-slate-300 text-xs">{getTipoLabel(item.tipo)}</span>
                                      </div>
                                    </td>
                                    <td className="p-4 text-slate-400 text-xs">
                                      {item.tipo === 'LICENCIAS_INSTITUCIONAL' && item.cantidadLicencias && (
                                        <div className="flex flex-col gap-1">
                                          <span>📦 {item.cantidadLicencias} licencias</span>
                                          {item.licenciasUsadas !== undefined && (
                                            <span className="text-yellow-400">✅ {item.licenciasUsadas} usadas</span>
                                          )}
                                        </div>
                                      )}
                                      {item.tipo === 'PAQUETE_LLAMADAS' && item.cantidadLlamadas && (
                                        <div className="flex flex-col gap-1">
                                          <span>📞 {item.cantidadLlamadas} llamadas</span>
                                          {item.llamadasUsadas !== undefined && item.llamadasUsadas > 0 && (
                                            <span className="text-yellow-400">✅ {item.llamadasUsadas} usadas</span>
                                          )}
                                        </div>
                                      )}
                                      {item.usuario && (
                                        <span>👤 {item.usuario}</span>
                                      )}
                                    </td>
                                    <td className="p-4 text-slate-500 text-xs">
                                        <Calendar size={12} className="inline mr-1"/> {new Date(item.creado).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                                          item.estado === 'DISPONIBLE' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30' : 
                                          item.estado === 'CANJEADO' ? 'bg-blue-900/20 text-blue-400 border-blue-500/30' :
                                          'bg-slate-800 text-slate-500 border-slate-700'
                                        }`}>
                                            {item.estado}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          {item.estado === 'DISPONIBLE' && (
                                            <button 
                                                onClick={() => copiarCodigo(item.codigo)}
                                                className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                                                title="Copiar código"
                                            >
                                                {copiado === item.codigo ? (
                                                  <CheckCircle2 size={16} className="text-green-400" />
                                                ) : (
                                                  <Copy size={16}/>
                                                )}
                                            </button>
                                          )}
                                          <button 
                                              onClick={() => eliminarCodigo(item.id)}
                                              className="p-2 hover:bg-red-900/20 rounded text-slate-400 hover:text-red-400 transition-colors"
                                              title="Eliminar"
                                          >
                                              <Trash2 size={16}/>
                                          </button>
                                        </div>
                                    </td>
                                </tr>
                              ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
