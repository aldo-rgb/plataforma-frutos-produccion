'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle, User, RefreshCw } from 'lucide-react';

interface LlamadaDisciplina {
  id: number;
  alumno: string;
  hora: string;
  foto: string | null;
  strikes: number;
  maxStrikes: number;
  status: 'PENDING' | 'PRESENT' | 'ABSENT';
  weekNumber: number;
}

export default function WidgetDisciplina() {
  const [llamadas, setLlamadas] = useState<LlamadaDisciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);

  useEffect(() => {
    cargarLlamadas();
  }, []);

  const cargarLlamadas = async () => {
    try {
      const res = await fetch('/api/mentor/disciplina/hoy');
      const data = await res.json();
      
      if (data.success) {
        setLlamadas(data.llamadas);
      }
    } catch (error) {
      console.error('Error cargando llamadas:', error);
    } finally {
      setLoading(false);
    }
  };

  const registrarAsistencia = async (bookingId: number, present: boolean) => {
    setProcesando(bookingId);
    
    // Optimistic UI update
    setLlamadas(prev => prev.map(call => 
      call.id === bookingId ? { ...call, status: present ? 'PRESENT' : 'ABSENT' } : call
    ));

    try {
      const res = await fetch('/api/mentor/disciplina/asistencia', {
        method: 'POST',
        body: JSON.stringify({ bookingId, present }),
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      if (data.success) {
        if (data.isSuspended) {
          alert(`⚠️ ALUMNO SUSPENDIDO\n\nEl estudiante ha alcanzado ${data.strikes} faltas y ha sido suspendido del programa.\nTodas sus llamadas futuras han sido canceladas.`);
        } else if (!present) {
          alert(`Falta registrada. Strike ${data.strikes}/${data.maxStrikes}`);
        }
        // Recargar lista para reflejar cambios
        await cargarLlamadas();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error guardando asistencia:', error);
      // Revertir cambio optimista
      setLlamadas(prev => prev.map(call => 
        call.id === bookingId ? { ...call, status: 'PENDING' } : call
      ));
      alert('Error al guardar la asistencia. Intenta nuevamente.');
    } finally {
      setProcesando(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#0f111a] border border-gray-800 rounded-xl h-48 animate-pulse">
        <div className="p-4 bg-[#151725] h-16"></div>
        <div className="p-4 space-y-3">
          <div className="h-12 bg-gray-800 rounded"></div>
          <div className="h-12 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f111a] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
      {/* HEADER */}
      <div className="p-4 border-b border-gray-800 bg-[#151725] flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            🚨 Llamadas de Disciplina
          </h3>
          <p className="text-xs text-gray-400">Hoy, {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full text-xs font-bold border border-purple-500/30">
            {llamadas.filter(l => l.status === 'PENDING').length} Pendientes
          </span>
          <button
            onClick={cargarLlamadas}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* LISTA DE LLAMADAS */}
      <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto">
        {llamadas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="mx-auto mb-2 opacity-50 w-12 h-12" />
            <p className="font-medium">¡Todo limpio!</p>
            <p className="text-sm">No hay llamadas programadas para hoy.</p>
          </div>
        ) : (
          llamadas.map((call) => (
            <div key={call.id} className="p-4 hover:bg-[#1a1d2d] transition-colors flex items-center justify-between group">
              
              {/* INFO ALUMNO */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {call.foto ? (
                    <img src={call.foto} alt={call.alumno} className="w-10 h-10 rounded-full border border-gray-600 object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300">
                      <User size={18} />
                    </div>
                  )}
                  {/* Indicador de Peligro (Si está a 1 strike de morir) */}
                  {call.strikes >= call.maxStrikes - 1 && call.status === 'PENDING' && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse" title="En riesgo de expulsión">
                      !
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="font-bold text-gray-200 text-sm">{call.alumno}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded">
                      <Clock size={10} /> {call.hora}
                    </span>
                    <span className="text-xs text-gray-500">
                      Semana {call.weekNumber}
                    </span>
                    {/* Visualización de Vidas/Strikes */}
                    <div className="flex gap-0.5" title={`${call.strikes} faltas acumuladas de ${call.maxStrikes} permitidas`}>
                       {[...Array(call.maxStrikes)].map((_, i) => (
                         <div 
                           key={i} 
                           className={`w-2 h-2 rounded-full ${
                             i < call.strikes ? 'bg-red-500' : 'bg-green-500/30'
                           }`} 
                         />
                       ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ACCIONES (Solo si está pendiente) */}
              {call.status === 'PENDING' ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => registrarAsistencia(call.id, false)}
                    disabled={procesando === call.id}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Marcar Falta (Strike)"
                  >
                    <XCircle size={18} />
                  </button>
                  <button 
                    onClick={() => registrarAsistencia(call.id, true)}
                    disabled={procesando === call.id}
                    className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-all border border-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Confirmar Asistencia"
                  >
                    <CheckCircle size={18} />
                  </button>
                </div>
              ) : (
                <div className={`text-xs font-bold px-3 py-1 rounded-full ${
                  call.status === 'PRESENT' ? 'text-green-500 bg-green-900/20 border border-green-500/30' : 'text-red-500 bg-red-900/20 border border-red-500/30'
                }`}>
                  {call.status === 'PRESENT' ? '✓ ASISTIÓ' : '✗ FALTÓ'}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
