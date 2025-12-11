'use client';

import { useState } from 'react';
import { DollarSign, Save, RefreshCw, Shield, Zap, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminPreciosPage() {
  const [isSaving, setIsSaving] = useState(false);

  // ESTADO DE PRECIOS (Estos vendrían de tu Base de Datos)
  const [precios, setPrecios] = useState({
    standard: { mensual: 150, anual: 1200 },
    quantum: { mensual: 500, anual: 5000 },
    centro: { alumno: 800 } // Precio por alumno al año
  });

  const handleChange = (categoria: string, tipo: string, valor: string) => {
    setPrecios(prev => ({
      ...prev,
      [categoria]: {
        ...prev[categoria as keyof typeof prev],
        [tipo]: Number(valor)
      }
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    // AQUÍ: Guardar en Base de Datos (Prisma)
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <DollarSign className="text-emerald-500" size={32} />
          Gestión de Precios y Planes
        </h1>
        <p className="text-slate-400">Define el valor de mercado para cada nivel de suscripción.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* 1. PLAN STANDARD */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                <div className="bg-blue-900/20 p-2 rounded-lg text-blue-400"><Shield size={24}/></div>
                <div>
                    <h3 className="text-white font-bold">Plan Standard</h3>
                    <p className="text-xs text-slate-500">Solo Acceso al Sistema</p>
                </div>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mensual (MXN)</label>
                    <input type="number" value={precios.standard.mensual} onChange={(e) => handleChange('standard', 'mensual', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white font-bold"/>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Anual (MXN)</label>
                    <input type="number" value={precios.standard.anual} onChange={(e) => handleChange('standard', 'anual', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white font-bold"/>
                </div>
            </div>
        </div>

        {/* 2. PLAN SALTO CUÁNTICO */}
        <div className="bg-slate-900 border border-yellow-500/30 rounded-xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-yellow-500 text-slate-900 text-[10px] font-bold px-2 py-1">PREMIUM</div>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                <div className="bg-yellow-900/20 p-2 rounded-lg text-yellow-400"><Zap size={24}/></div>
                <div>
                    <h3 className="text-white font-bold">Salto Cuántico</h3>
                    <p className="text-xs text-slate-500">Mentor + Coaching</p>
                </div>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mensual (MXN)</label>
                    <input type="number" value={precios.quantum.mensual} onChange={(e) => handleChange('quantum', 'mensual', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white font-bold text-yellow-500"/>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Anual (MXN)</label>
                    <input type="number" value={precios.quantum.anual} onChange={(e) => handleChange('quantum', 'anual', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white font-bold text-yellow-500"/>
                </div>
            </div>
        </div>

        {/* 3. PLAN CENTROS (INSTITUCIONAL) */}
        <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                <div className="bg-purple-900/20 p-2 rounded-lg text-purple-400"><Building2 size={24}/></div>
                <div>
                    <h3 className="text-white font-bold">Plan Centros</h3>
                    <p className="text-xs text-slate-500">Volumen (Con Mentor)</p>
                </div>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Costo por Alumno (Anual)</label>
                    <input type="number" value={precios.centro.alumno} onChange={(e) => handleChange('centro', 'alumno', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white font-bold text-purple-400"/>
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-800 text-xs text-slate-500">
                    * Incluye características de Salto Cuántico excepto la llamada mensual.
                </div>
            </div>
        </div>

      </div>

      <div className="mt-8 flex justify-end">
        <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
        >
            {isSaving ? <RefreshCw className="animate-spin" size={20}/> : <Save size={20}/>}
            {isSaving ? 'Guardando Cambios...' : 'Actualizar Tarifas'}
        </button>
      </div>
    </div>
  );
}
