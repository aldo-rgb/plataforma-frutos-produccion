'use client';

import React, { useState } from 'react';
import { 
  CheckCircle, XCircle, Loader2, Target, Users, Zap, 
  Clock, AlertTriangle, MessageSquare, ShieldCheck, Star 
} from 'lucide-react';

// DATOS MOCK: Simulando evidencias que esperan la aprobación del Mentor
const MOCK_EVIDENCIAS = [
  { id: 201, lider: 'Carlos Ruiz', categoria: 'Salud', meta: 'Correr 5K (Sesión 3/5)', fecha: '2 horas', url: '/placeholder-gym.jpg', recompensa: 500 },
  { id: 202, lider: 'Ana García', categoria: 'Finanzas', meta: 'Estudiar plan de inversión', fecha: '1 día', url: '/placeholder-book.jpg', recompensa: 500 },
  { id: 203, lider: 'Javier Pérez', categoria: 'Paz Mental', meta: 'Meditar 10 minutos', fecha: '2 días', url: '/placeholder-meditation.jpg', recompensa: 500 },
  { id: 204, lider: 'Laura V.', categoria: 'Relaciones', meta: 'Cena semanal con mi pareja', fecha: '3 días', url: '/placeholder-dinner.jpg', recompensa: 500 },
];

export default function RevisionEvidenciasPage() {
  const [pendientes, setPendientes] = useState(MOCK_EVIDENCIAS);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const handleReview = async (evidenciaId: number, accion: 'APROBAR' | 'RECHAZAR', puntos: number) => {
    setProcesando(evidenciaId);

    try {
      // Llamada a la API de revisión (la que ya creamos en /api/evidencia/revisar)
      const res = await fetch('/api/evidencia/revisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          evidenciaId, 
          accion, 
          puntosRecompensa: puntos 
        }),
      });

      if (!res.ok) throw new Error("Fallo en la revisión API. Revisa el log del servidor para detalles de la BD.");
      
      // 1. Eliminar la tarjeta de la vista
      setPendientes(prev => prev.filter(e => e.id !== evidenciaId));
      
      // 2. Mostrar Toast
      setToastType('success');
      setToastMessage(accion === 'APROBAR' 
        ? `APROBADA. Puntos Cuánticos (${puntos}) liberados.` 
        : 'RECHAZADA. Tarea revertida.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);

    } catch (error) {
      setToastType('error');
      setToastMessage(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* --- TOAST DE REVISIÓN --- */}
      {showToast && (
        <div className="fixed top-24 right-4 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className={`bg-slate-900 border ${toastType === 'success' ? 'border-green-500/50 shadow-green-500/20' : 'border-red-500/50 shadow-red-500/20'} text-white px-6 py-4 rounded-2xl flex items-center gap-4`}>
            <div className={`h-10 w-10 ${toastType === 'success' ? 'bg-green-500' : 'bg-red-500'} rounded-full flex items-center justify-center shadow-lg`}>
              {toastType === 'success' ? <CheckCircle size={24} className="text-slate-900" /> : <XCircle size={24} className="text-slate-900" />}
            </div>
            <div>
              <h4 className="font-bold text-sm">REVISIÓN COMPLETA</h4>
              <p className="text-xs text-slate-400">{toastMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-end border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter">
            Bandeja de <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Integridad</span>
          </h1>
          <p className="text-slate-400 mt-2">Valida las acciones del Líder para liberar su recompensa.</p>
        </div>
        <div className="bg-slate-900 border border-yellow-500/30 px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] uppercase text-slate-500 font-bold">Pendientes</p>
            <p className="text-xl font-black text-white">{pendientes.length}</p>
        </div>
      </div>

      {/* GRID DE EVIDENCIAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pendientes.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-500 bg-slate-900 rounded-3xl border border-white/10">
                <CheckCircle size={48} className="mx-auto mb-4 text-green-500/50" />
                <p>¡El Quantum está limpio! No hay evidencias pendientes.</p>
            </div>
        ) : (
            pendientes.map((evidencia) => (
                <div key={evidencia.id} className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-lg flex flex-col">
                    
                    {/* Header y Info */}
                    <div className="p-4 flex items-center justify-between border-b border-white/5">
                        <div className='flex items-center gap-3'>
                            <Users size={18} className="text-cyan-400" />
                            <div>
                                <h3 className="font-bold text-white text-sm">{evidencia.lider}</h3>
                                <p className="text-xs text-slate-500">{evidencia.fecha} • {evidencia.categoria}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-full text-xs font-bold text-yellow-400">
                           <Zap size={14} fill="currentColor" /> {evidencia.recompensa} PC
                        </div>
                    </div>

                    {/* Meta y Evidencia (Foto) */}
                    <div className="p-4 flex-1">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">Meta:</div>
                        <p className="text-white font-medium mb-4">{evidencia.meta}</p>

                        <div className="h-48 bg-slate-950 relative flex items-center justify-center text-slate-700 rounded-lg overflow-hidden border border-white/5">
                            {/* PLACEHOLDER: Aquí iría la imagen real */}
                            <div className="text-xs text-slate-700">
                                [FOTO DE EVIDENCIA SUBIDA POR {evidencia.lider}]
                            </div>
                            <button className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <Star size={24} className="text-yellow-400" />
                            </button>
                        </div>
                    </div>

                    {/* Acciones del Mentor */}
                    <div className="p-4 grid grid-cols-2 gap-3 mt-auto border-t border-white/5">
                        <button 
                            onClick={() => handleReview(evidencia.id, 'RECHAZAR', 0)}
                            disabled={procesando === evidencia.id}
                            className="flex items-center justify-center gap-2 py-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-sm font-bold disabled:opacity-50"
                        >
                            {procesando === evidencia.id ? <Loader2 size={16} className='animate-spin' /> : <XCircle size={18} />} 
                            Rechazar
                        </button>
                        <button 
                            onClick={() => handleReview(evidencia.id, 'APROBAR', evidencia.recompensa)}
                            disabled={procesando === evidencia.id}
                            className="flex items-center justify-center gap-2 py-3 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-colors text-sm font-bold disabled:opacity-50"
                        >
                            {procesando === evidencia.id ? <Loader2 size={16} className='animate-spin' /> : <ShieldCheck size={18} />} 
                            Aprobar
                        </button>
                    </div>
                </div>
            ))
        )}
      </div>

    </div>
  );
}