'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Award, CheckCircle2, X, Loader2, ArrowLeft, Star, Trophy, Crown, Zap, Shield, Heart } from 'lucide-react';
import Link from 'next/link';

const CONDECORACIONES_DISPONIBLES = [
  // Categoría: Reconocimientos Generales
  { id: 'excelencia', nombre: 'Excelencia', icono: '🏆', descripcion: 'Por desempeño excepcional', color: 'yellow', categoria: 'general' },
  { id: 'liderazgo', nombre: 'Liderazgo', icono: '👑', descripcion: 'Por liderar con el ejemplo', color: 'purple', categoria: 'general' },
  { id: 'perseverancia', nombre: 'Perseverancia', icono: '💪', descripcion: 'Por nunca rendirse', color: 'orange', categoria: 'general' },
  { id: 'innovacion', nombre: 'Innovación', icono: '💡', descripcion: 'Por ideas creativas', color: 'blue', categoria: 'general' },
  { id: 'trabajo-equipo', nombre: 'Trabajo en Equipo', icono: '🤝', descripcion: 'Por colaboración destacada', color: 'green', categoria: 'general' },
  { id: 'compromiso', nombre: 'Compromiso', icono: '⭐', descripcion: 'Por dedicación constante', color: 'cyan', categoria: 'general' },
  { id: 'mejora-continua', nombre: 'Mejora Continua', icono: '📈', descripcion: 'Por crecimiento sostenido', color: 'indigo', categoria: 'general' },
  { id: 'mentor', nombre: 'Mentor Destacado', icono: '🎓', descripcion: 'Por guiar a otros', color: 'pink', categoria: 'general' },
  { id: 'valor', nombre: 'Valor', icono: '🦁', descripcion: 'Por valentía y coraje', color: 'red', categoria: 'general' },
  { id: 'impacto', nombre: 'Alto Impacto', icono: '🚀', descripcion: 'Por resultados extraordinarios', color: 'violet', categoria: 'general' },
  
  // Categoría: Roles de Staff
  { id: 'staff-basico', nombre: 'Staff Básico', icono: '⚡', descripcion: 'Certificado como Staff nivel básico', color: 'blue', categoria: 'staff' },
  { id: 'staff-avanzado', nombre: 'Staff Avanzado', icono: '🔥', descripcion: 'Certificado como Staff nivel avanzado', color: 'red', categoria: 'staff' },
  { id: 'game-changer', nombre: 'Game Changer', icono: '🎯', descripcion: 'Líder transformacional del programa', color: 'purple', categoria: 'staff' },
  { id: 'servicio', nombre: 'Servicio', icono: '🙏', descripcion: 'Por espíritu de servicio sobresaliente', color: 'green', categoria: 'staff' },
  { id: 'super-nova', nombre: 'Super Nova', icono: '🌟', descripcion: 'Se otorga automáticamente al completar las 4 anteriores', color: 'yellow', categoria: 'staff', autoAsignada: true }
];

export default function AsignarCondecoracionesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get('userId');
  const nombreUsuario = searchParams.get('nombre');

  const [condecoracionesActuales, setCondecoracionesActuales] = useState<string[]>([]);
  const [condecoracionesSeleccionadas, setCondecoracionesSeleccionadas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (userId) {
      cargarCondecoraciones();
    }
  }, [userId]);

  const cargarCondecoraciones = async () => {
    try {
      const res = await fetch(`/api/configuracion?userId=${userId}`);
      const data = await res.json();
      
      if (res.ok && data.config?.condecoraciones) {
        setCondecoracionesActuales(data.config.condecoraciones);
        setCondecoracionesSeleccionadas(data.config.condecoraciones);
      }
    } catch (error) {
      console.error('Error cargando condecoraciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCondecoracion = (id: string) => {
    // No permitir deseleccionar Super Nova si se cumple la condición
    if (id === 'super-nova' && condecoracionesSeleccionadas.includes(id)) {
      const tieneTodasLasRequeridas = ['staff-basico', 'staff-avanzado', 'game-changer', 'servicio'].every(
        reqId => condecoracionesSeleccionadas.includes(reqId)
      );
      if (tieneTodasLasRequeridas) {
        setMessage({ 
          type: 'error', 
          text: '⚠️ Super Nova no se puede quitar mientras tengas las 4 condecoraciones requeridas' 
        });
        setTimeout(() => setMessage(null), 3000);
        return;
      }
    }

    setCondecoracionesSeleccionadas(prev => {
      const nuevaSeleccion = prev.includes(id) 
        ? prev.filter(c => c !== id)
        : [...prev, id];
      
      // Auto-asignar Super Nova si tiene las 4 requeridas
      const tieneTodasLasRequeridas = ['staff-basico', 'staff-avanzado', 'game-changer', 'servicio'].every(
        reqId => nuevaSeleccion.includes(reqId)
      );
      
      if (tieneTodasLasRequeridas && !nuevaSeleccion.includes('super-nova')) {
        setMessage({ 
          type: 'success', 
          text: '🌟 ¡Super Nova asignada automáticamente! Has completado las 4 distinciones requeridas' 
        });
        setTimeout(() => setMessage(null), 4000);
        return [...nuevaSeleccion, 'super-nova'];
      }
      
      // Remover Super Nova si se quita alguna de las 4 requeridas
      if (!tieneTodasLasRequeridas && nuevaSeleccion.includes('super-nova')) {
        setMessage({ 
          type: 'error', 
          text: '⚠️ Super Nova removida automáticamente. Se requieren las 4 distinciones de Staff' 
        });
        setTimeout(() => setMessage(null), 4000);
        return nuevaSeleccion.filter(c => c !== 'super-nova');
      }
      
      return nuevaSeleccion;
    });
  };

  const guardarCondecoraciones = async () => {
    if (!userId) return;

    try {
      setSaving(true);
      setMessage(null);

      const res = await fetch('/api/coordinador/condecoraciones/asignar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId: parseInt(userId),
          condecoraciones: condecoracionesSeleccionadas
        })
      });

      const data = await res.json();

      if (res.ok) {
        setCondecoracionesActuales(condecoracionesSeleccionadas);
        setMessage({ type: 'success', text: '✅ Condecoraciones actualizadas correctamente' });
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
          router.push('/dashboard/coordinador/participantes');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar' });
      }
    } catch (error) {
      console.error('Error guardando condecoraciones:', error);
      setMessage({ type: 'error', text: 'Error al guardar las condecoraciones' });
    } finally {
      setSaving(false);
    }
  };

  const getColorClasses = (color: string, selected: boolean) => {
    const colors: Record<string, { bg: string, border: string, text: string, selectedBg: string, selectedBorder: string }> = {
      yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', selectedBg: 'bg-yellow-500/30', selectedBorder: 'border-yellow-500' },
      purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', selectedBg: 'bg-purple-500/30', selectedBorder: 'border-purple-500' },
      orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', selectedBg: 'bg-orange-500/30', selectedBorder: 'border-orange-500' },
      blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', selectedBg: 'bg-blue-500/30', selectedBorder: 'border-blue-500' },
      green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', selectedBg: 'bg-green-500/30', selectedBorder: 'border-green-500' },
      cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', selectedBg: 'bg-cyan-500/30', selectedBorder: 'border-cyan-500' },
      indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', selectedBg: 'bg-indigo-500/30', selectedBorder: 'border-indigo-500' },
      pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', selectedBg: 'bg-pink-500/30', selectedBorder: 'border-pink-500' },
      red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', selectedBg: 'bg-red-500/30', selectedBorder: 'border-red-500' },
      violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', selectedBg: 'bg-violet-500/30', selectedBorder: 'border-violet-500' }
    };

    const colorSet = colors[color] || colors.yellow;
    return selected 
      ? `${colorSet.selectedBg} ${colorSet.selectedBorder} ${colorSet.text}`
      : `${colorSet.bg} ${colorSet.border} ${colorSet.text}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/coordinador/participantes"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver a Participantes
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="p-4 bg-yellow-500/20 rounded-2xl">
              <Award size={40} className="text-yellow-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Asignar Condecoraciones</h1>
              <p className="text-slate-400">Participante: <span className="text-white font-semibold">{nombreUsuario || 'Usuario'}</span></p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/30 text-green-400' 
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Grid de Condecoraciones */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy size={24} className="text-yellow-400" />
            Selecciona las condecoraciones a otorgar
          </h2>
          
          {/* Categoría: Reconocimientos Generales */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center gap-2">
              <Star size={20} />
              Reconocimientos Generales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CONDECORACIONES_DISPONIBLES.filter(c => c.categoria === 'general').map((cond) => {
                const isSelected = condecoracionesSeleccionadas.includes(cond.id);
                
                return (
                  <button
                    key={cond.id}
                    onClick={() => toggleCondecoracion(cond.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left hover:scale-105 ${
                      getColorClasses(cond.color, isSelected)
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{cond.icono}</span>
                        <div>
                          <h3 className="font-bold text-white">{cond.nombre}</h3>
                          <p className="text-xs text-slate-400">{cond.descripcion}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 size={24} className="text-green-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Categoría: Roles de Staff */}
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
              <Shield size={20} />
              Roles de Staff y Distinciones Especiales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CONDECORACIONES_DISPONIBLES.filter(c => c.categoria === 'staff').map((cond) => {
                const isSelected = condecoracionesSeleccionadas.includes(cond.id);
                const isSuperNova = cond.id === 'super-nova';
                const tieneLas4Requeridas = ['staff-basico', 'staff-avanzado', 'game-changer', 'servicio'].every(
                  reqId => condecoracionesSeleccionadas.includes(reqId)
                );
                
                return (
                  <button
                    key={cond.id}
                    onClick={() => toggleCondecoracion(cond.id)}
                    disabled={isSuperNova}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      isSuperNova 
                        ? 'cursor-not-allowed opacity-75' 
                        : 'hover:scale-105 cursor-pointer'
                    } ${getColorClasses(cond.color, isSelected)} ${
                      isSuperNova && isSelected ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{cond.icono}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white">{cond.nombre}</h3>
                            {isSuperNova && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full font-bold">
                                AUTO
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{cond.descripcion}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 size={24} className={isSuperNova ? 'text-yellow-400' : 'text-green-400'} />
                      )}
                    </div>
                    {isSuperNova && (
                      <div className="mt-2 pt-2 border-t border-slate-700">
                        <p className="text-xs text-slate-500">
                          Requisitos: {tieneLas4Requeridas ? '✅' : '⏳'} Staff Básico + Staff Avanzado + Game Changer + Servicio
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Resumen y Acciones */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Resumen de Selección</h3>
              <p className="text-slate-400">
                {condecoracionesSeleccionadas.length} condecoración{condecoracionesSeleccionadas.length !== 1 ? 'es' : ''} seleccionada{condecoracionesSeleccionadas.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCondecoracionesSeleccionadas([])}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"
              >
                Limpiar Todo
              </button>
              
              <button
                onClick={guardarCondecoraciones}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-slate-700 disabled:to-slate-700 text-black font-bold rounded-lg transition-all flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Award size={20} />
                    Guardar Condecoraciones
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview de seleccionadas */}
          {condecoracionesSeleccionadas.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800">
              {condecoracionesSeleccionadas.map(condId => {
                const cond = CONDECORACIONES_DISPONIBLES.find(c => c.id === condId);
                if (!cond) return null;
                
                return (
                  <div
                    key={condId}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full text-sm"
                  >
                    <span>{cond.icono}</span>
                    <span className="text-white font-medium">{cond.nombre}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
