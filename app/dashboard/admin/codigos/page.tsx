'use client';

import { useState } from 'react';
import { Gift, Copy, Plus, RefreshCw, CheckCircle2, Ticket, Calendar } from 'lucide-react';
import Link from 'next/link';

// MOCK DATA
const CODIGOS_INICIALES = [
  { id: 1, codigo: 'BEC-2025-A', tipo: 'ANUALIDAD', estado: 'DISPONIBLE', creado: '2025-10-01' },
  { id: 2, codigo: 'PROMO-INICIO', tipo: 'DESCUENTO 50%', estado: 'CANJEADO', creado: '2025-09-15', usuario: 'Juan Pérez' },
  { id: 3, codigo: 'GIFT-XMAS-99', tipo: 'ANUALIDAD', estado: 'DISPONIBLE', creado: '2025-12-01' },
];

export default function GeneradorCodigosPage() {
  const [codigos, setCodigos] = useState(CODIGOS_INICIALES);
  const [tipoNuevo, setTipoNuevo] = useState('ANUALIDAD 100%');
  const [cantidad, setCantidad] = useState(1);
  const [generando, setGenerando] = useState(false);

  // Función para generar string aleatorio
  const generarString = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const handleGenerar = () => {
    setGenerando(true);
    setTimeout(() => {
        const nuevos = [];
        for(let i=0; i<cantidad; i++) {
            nuevos.push({
                id: Date.now() + i,
                codigo: `GIFT-${generarString()}`,
                tipo: tipoNuevo,
                estado: 'DISPONIBLE',
                creado: new Date().toISOString().split('T')[0]
            });
        }
        setCodigos([...nuevos, ...codigos]);
        setGenerando(false);
    }, 800);
  };

  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    alert(`Copiado: ${codigo}`);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Gift className="text-yellow-500" size={32} />
          Generador de Códigos de Regalo
        </h1>
        <p className="text-slate-400">Crea licencias prepagadas o cupones promocionales.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* PANEL DE CREACIÓN */}
        <div className="lg:col-span-1">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-6 border-b border-slate-800 pb-2">Nueva Emisión</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tipo de Beneficio</label>
                        <select 
                            value={tipoNuevo}
                            onChange={(e) => setTipoNuevo(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none"
                        >
                            <option value="ANUALIDAD 100%">Membresía Anual (Gratis)</option>
                            <option value="MENSUALIDAD 100%">1 Mes (Gratis)</option>
                            <option value="DESCUENTO 50%">50% Descuento</option>
                            <option value="DESCUENTO 20%">20% Descuento</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Cantidad a Generar</label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="number" min="1" max="50"
                                value={cantidad}
                                onChange={(e) => setCantidad(Number(e.target.value))}
                                className="w-20 bg-slate-950 border border-slate-700 rounded-lg p-3 text-center text-white font-bold"
                            />
                            <span className="text-sm text-slate-500">cupones únicos</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerar}
                        disabled={generando}
                        className="w-full mt-4 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        {generando ? <RefreshCw className="animate-spin"/> : <Plus size={20}/>}
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
                    <h3 className="text-slate-300 font-bold flex items-center gap-2"><Ticket size={18}/> Inventario de Códigos</h3>
                    <button className="text-xs text-blue-400 hover:text-white">Exportar CSV</button>
                </div>
                
                <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-900 text-xs uppercase text-slate-500 font-bold">
                            <tr>
                                <th className="p-4">Código</th>
                                <th className="p-4">Beneficio</th>
                                <th className="p-4">Creado</th>
                                <th className="p-4">Estado</th>
                                <th className="p-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm">
                            {codigos.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-800/50">
                                    <td className="p-4">
                                        <div className="font-mono font-bold text-white tracking-wider">{item.codigo}</div>
                                    </td>
                                    <td className="p-4 text-slate-300">{item.tipo}</td>
                                    <td className="p-4 text-slate-500 flex items-center gap-1">
                                        <Calendar size={12}/> {item.creado}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold border ${item.estado === 'DISPONIBLE' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                            {item.estado}
                                        </span>
                                        {item.usuario && <div className="text-[10px] text-slate-500 mt-1">Por: {item.usuario}</div>}
                                    </td>
                                    <td className="p-4 text-right">
                                        {item.estado === 'DISPONIBLE' && (
                                            <button 
                                                onClick={() => copiarCodigo(item.codigo)}
                                                className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                                                title="Copiar"
                                            >
                                                <Copy size={16}/>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
