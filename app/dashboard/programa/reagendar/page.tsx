'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

interface Programa {
  id: number;
  mentor: {
    id: number;
    nombre: string;
    foto?: string;
  };
  totalWeeks: number;
  sesionesCompletadas: number;
  semanasCompletadas: number;
  semanasRestantes: number;
}

interface Slot {
  dayOfWeek: number;
  time: string;
}

const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado'
];

const HORARIOS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00'
];

export default function ReagendarProgramaPage() {
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [programaSeleccionado, setProgramaSeleccionado] = useState<Programa | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReagendando, setIsReagendando] = useState(false);
  const [success, setSuccess] = useState(false);

  // Slots seleccionados
  const [slot1, setSlot1] = useState<Slot>({ dayOfWeek: 1, time: '09:00' });
  const [slot2, setSlot2] = useState<Slot>({ dayOfWeek: 3, time: '09:00' });

  useEffect(() => {
    cargarProgramasPendientes();
  }, []);

  const cargarProgramasPendientes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/program/pendiente-reagendar');
      if (!response.ok) throw new Error('Error al cargar programas');
      
      const data = await response.json();
      setProgramas(data.programas || []);
      
      // Si hay solo un programa, seleccionarlo automáticamente
      if (data.programas?.length === 1) {
        setProgramaSeleccionado(data.programas[0]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReagendar = async () => {
    if (!programaSeleccionado) return;

    // Validar que los días sean diferentes
    if (slot1.dayOfWeek === slot2.dayOfWeek) {
      alert('⚠️ Debes seleccionar días diferentes para cada sesión semanal');
      return;
    }

    setIsReagendando(true);

    try {
      const response = await fetch('/api/program/reagendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: programaSeleccionado.id,
          slot1,
          slot2
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Error al re-agendar');
        return;
      }

      setSuccess(true);

      // Redirigir al dashboard después de 3 segundos
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 3000);

    } catch (error) {
      console.error('Error al re-agendar:', error);
      alert('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsReagendando(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (programas.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="text-green-400" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Todo al Día</h2>
          <p className="text-slate-400 mb-6">
            No tienes programas pendientes de re-agendar.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Ir al Dashboard
            <ArrowRight size={20} />
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-green-500/30 rounded-2xl p-8 max-w-md text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500">
            <CheckCircle2 className="text-green-400" size={40} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">¡Sesiones Re-agendadas!</h2>
          <p className="text-slate-300 mb-2">
            Tus sesiones han sido actualizadas con tu nuevo mentor.
          </p>
          <p className="text-slate-500 text-sm">
            Serás redirigido al dashboard en unos segundos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/20 rounded-full mb-4">
            <Calendar className="text-purple-400" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Re-agendar Programa Intensivo
          </h1>
          <p className="text-slate-400">
            Tu mentor ha cambiado. Selecciona tus nuevos horarios semanales.
          </p>
        </div>

        {/* Advertencia */}
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-1" size={24} />
            <div className="text-yellow-200 text-sm">
              <p className="font-semibold mb-2">⚠️ Información Importante</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Solo se agendarán las <strong>semanas restantes</strong> de tu programa</li>
                <li>Tus sesiones completadas anteriormente <strong>se mantienen</strong></li>
                <li>Debes seleccionar <strong>2 días diferentes</strong> por semana</li>
                <li>Los horarios serán con tu <strong>nuevo mentor</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Info del Programa */}
        {programaSeleccionado && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              {programaSeleccionado.mentor.foto && (
                <img
                  src={programaSeleccionado.mentor.foto}
                  alt={programaSeleccionado.mentor.nombre}
                  className="w-16 h-16 rounded-full object-cover border-2 border-purple-500"
                />
              )}
              <div>
                <h3 className="text-xl font-bold text-white">
                  {programaSeleccionado.mentor.nombre}
                </h3>
                <p className="text-sm text-slate-400">Tu nuevo mentor</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-slate-800/50 rounded-lg p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">
                  {programaSeleccionado.semanasCompletadas}
                </p>
                <p className="text-xs text-slate-400">Semanas Completadas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">
                  {programaSeleccionado.semanasRestantes}
                </p>
                <p className="text-xs text-slate-400">Semanas Restantes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">
                  {programaSeleccionado.semanasRestantes * 2}
                </p>
                <p className="text-xs text-slate-400">Sesiones a Agendar</p>
              </div>
            </div>
          </div>
        )}

        {/* Selectores de Horarios */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Slot 1 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                <span className="text-purple-400 font-bold">1</span>
              </div>
              <h3 className="text-lg font-bold text-white">Primera Sesión Semanal</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">
                  Día de la Semana
                </label>
                <select
                  value={slot1.dayOfWeek}
                  onChange={(e) => setSlot1({ ...slot1, dayOfWeek: parseInt(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {DIAS_SEMANA.map((dia, index) => (
                    <option key={index} value={index} disabled={index === 0}>
                      {dia}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">
                  Hora
                </label>
                <select
                  value={slot1.time}
                  onChange={(e) => setSlot1({ ...slot1, time: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {HORARIOS.map(hora => (
                    <option key={hora} value={hora}>
                      {hora}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Slot 2 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 font-bold">2</span>
              </div>
              <h3 className="text-lg font-bold text-white">Segunda Sesión Semanal</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">
                  Día de la Semana
                </label>
                <select
                  value={slot2.dayOfWeek}
                  onChange={(e) => setSlot2({ ...slot2, dayOfWeek: parseInt(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DIAS_SEMANA.map((dia, index) => (
                    <option key={index} value={index} disabled={index === 0}>
                      {dia}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">
                  Hora
                </label>
                <select
                  value={slot2.time}
                  onChange={(e) => setSlot2({ ...slot2, time: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {HORARIOS.map(hora => (
                    <option key={hora} value={hora}>
                      {hora}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Validación visual */}
        {slot1.dayOfWeek === slot2.dayOfWeek && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-300 text-sm flex items-center gap-2">
              <AlertTriangle size={18} />
              <span>⚠️ Debes seleccionar <strong>días diferentes</strong> para cada sesión</span>
            </p>
          </div>
        )}

        {/* Resumen */}
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="text-purple-400" size={20} />
            Resumen de Horarios
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-slate-400 mb-1">Sesión 1:</p>
              <p className="text-white font-bold">
                {DIAS_SEMANA[slot1.dayOfWeek]} a las {slot1.time}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-slate-400 mb-1">Sesión 2:</p>
              <p className="text-white font-bold">
                {DIAS_SEMANA[slot2.dayOfWeek]} a las {slot2.time}
              </p>
            </div>
          </div>
        </div>

        {/* Botón de Confirmación */}
        <button
          onClick={handleReagendar}
          disabled={isReagendando || slot1.dayOfWeek === slot2.dayOfWeek}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isReagendando ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              Re-agendando Sesiones...
            </>
          ) : (
            <>
              <CheckCircle2 size={24} />
              Confirmar y Re-agendar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
