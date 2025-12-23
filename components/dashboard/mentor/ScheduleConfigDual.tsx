"use client";
import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, Save, Loader2, Lock, CheckCircle2, XCircle } from 'lucide-react';

const DAYS = [
  { id: 1, label: 'Lunes' },
  { id: 2, label: 'Martes' },
  { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' },
  { id: 5, label: 'Viernes' },
  { id: 6, label: 'Sábado' },
  { id: 0, label: 'Domingo' },
];

export default function ScheduleConfigDual({ mentorId }: { mentorId: number }) {
  const [activeTab, setActiveTab] = useState<'DISCIPLINE' | 'MENTORSHIP'>('DISCIPLINE');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [schedule, setSchedule] = useState(
    DAYS.map(d => ({
      dayOfWeek: d.id,
      label: d.label,
      isActive: false,
      startTime: '09:00', 
      endTime: '18:00'
    }))
  );

  // Cargar horario al cambiar de pestaña
  useEffect(() => {
    async function load() {
      setLoading(true);
      
      try {
        const res = await fetch(`/api/mentor/schedule?mentorId=${mentorId}&type=${activeTab}`, {
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache' }
        });
        
        const response = await res.json();
        const savedData = response.data?.availability || [];
        
        if (Array.isArray(savedData) && savedData.length > 0) {
          setSchedule(prev => prev.map(day => {
            const found = savedData.find((s: any) => s.dayOfWeek === day.dayOfWeek);
            if (found) {
              return { 
                ...day, 
                isActive: true, 
                startTime: found.startTime, 
                endTime: found.endTime 
              };
            }
            // Defaults inteligentes según el tipo
            return { 
              ...day, 
              isActive: false,
              startTime: activeTab === 'DISCIPLINE' ? '05:00' : '10:00',
              endTime: activeTab === 'DISCIPLINE' ? '08:00' : '18:00'
            };
          }));
          console.log(`✅ Cargados ${savedData.length} horarios de tipo ${activeTab}`);
        } else {
          // No hay horarios guardados, usar defaults
          setSchedule(prev => prev.map(day => ({
            ...day,
            isActive: false,
            startTime: activeTab === 'DISCIPLINE' ? '05:00' : '10:00',
            endTime: activeTab === 'DISCIPLINE' ? '08:00' : '18:00'
          })));
          console.log(`📅 No hay horarios guardados para ${activeTab}, usando valores por defecto`);
        }
      } catch (error) {
        console.error('Error cargando horarios:', error);
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, [mentorId, activeTab]);

  const handleSave = async () => {
    setSaving(true);
    setShowSuccess(false);
    setShowError(false);
    
    // Validación estricta SOLO para disciplina
    if (activeTab === 'DISCIPLINE') {
      const activeDays = schedule.filter(s => s.isActive);
      const hasInvalidTimes = activeDays.some(
        day => day.startTime < "05:00" || day.endTime > "08:00"
      );
      
      if (hasInvalidTimes) {
        setErrorMessage("Para Disciplina, el horario debe estar entre 05:00 y 08:00.");
        setShowError(true);
        setTimeout(() => setShowError(false), 5000);
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/mentor/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mentorId, 
          schedule, 
          type: activeTab 
        })
      });

      const data = await res.json();

      if (res.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        setErrorMessage(data.error || 'Error desconocido');
        setShowError(true);
        setTimeout(() => setShowError(false), 5000);
      }
    } catch (error) {
      console.error('Error guardando:', error);
      setErrorMessage('Error de conexión al servidor');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setSaving(false);
    }
  };

  const changeTime = (index: number, field: 'startTime' | 'endTime', value: string) => {
    // Validación en tiempo real SOLO para DISCIPLINE
    if (activeTab === 'DISCIPLINE') {
      if (value < "05:00" || value > "08:00") {
        setErrorMessage("Solo horarios entre 5:00 AM y 8:00 AM están permitidos para Disciplina.");
        setShowError(true);
        setTimeout(() => setShowError(false), 3000);
        return;
      }
    }
    
    const newSchedule = [...schedule];
    newSchedule[index][field] = value;
    setSchedule(newSchedule);
  };

  const toggleDay = (index: number) => {
    const newSchedule = [...schedule];
    newSchedule[index].isActive = !newSchedule[index].isActive;
    setSchedule(newSchedule);
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mr-3" />
          <p className="text-slate-400">Cargando horarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden max-w-4xl mx-auto">
      
      {/* Notificación de Éxito */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5 duration-300">
          <div className={`text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[320px] ${
            activeTab === 'DISCIPLINE' 
              ? 'bg-gradient-to-r from-purple-500 to-purple-600' 
              : 'bg-gradient-to-r from-blue-500 to-blue-600'
          }`}>
            <div className="bg-white/20 p-2 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg">¡Horario guardado!</p>
              <p className="text-sm opacity-90">
                {activeTab === 'DISCIPLINE' ? 'Disciplina' : 'Mentorías'} actualizado correctamente
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notificación de Error */}
      {showError && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5 duration-300">
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[320px]">
            <div className="bg-white/20 p-2 rounded-lg">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg">Error al guardar</p>
              <p className="text-sm text-red-50">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑAS SUPERIORES */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('DISCIPLINE')}
          className={`flex-1 py-4 text-center font-bold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'DISCIPLINE' 
              ? 'bg-slate-800 text-white border-b-4 border-purple-500' 
              : 'bg-slate-900/50 text-slate-500 hover:text-white hover:bg-slate-800/70'
          }`}
        >
          <Clock className="w-5 h-5" />
          Llamadas de Mentoria
        </button>
        <button
          onClick={() => setActiveTab('MENTORSHIP')}
          className={`flex-1 py-4 text-center font-bold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'MENTORSHIP' 
              ? 'bg-slate-800 text-white border-b-4 border-blue-500' 
              : 'bg-slate-900/50 text-slate-500 hover:text-white hover:bg-slate-800/70'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          Mentorías Pagadas
        </button>
      </div>

      <div className="p-6">
        {/* Banner Informativo */}
        <div className={`p-4 rounded-lg mb-6 border ${
          activeTab === 'DISCIPLINE' 
            ? 'bg-purple-900/20 border-purple-500/30 text-purple-200' 
            : 'bg-blue-900/20 border-blue-500/30 text-blue-200'
        }`}>
          <h3 className="font-bold flex items-center gap-2 mb-1">
            {activeTab === 'DISCIPLINE' ? '🌅 Club de las 5 AM' : '💼 Servicios Profesionales'}
          </h3>
          <p className="text-sm opacity-80">
            {activeTab === 'DISCIPLINE' 
              ? 'Configura tus bloques de 15 min. RECUERDA: Solo permitido de 05:00 a 08:00 AM.'
              : 'Configura tu disponibilidad para sesiones pagadas de 1 hora. Tienes libertad total de horario.'}
          </p>
          {activeTab === 'DISCIPLINE' && (
            <div className="mt-2 flex items-center gap-2 text-xs bg-purple-800/30 p-2 rounded">
              <Lock className="w-4 h-4" />
              <span>Restricción activa: Solo horarios entre 05:00 - 08:00</span>
            </div>
          )}
        </div>

        {/* LISTA DE DÍAS */}
        <div className="space-y-3">
          {schedule.map((day, index) => (
            <div 
              key={day.dayOfWeek} 
              className={`p-4 rounded-lg border transition-all ${
                day.isActive 
                  ? activeTab === 'DISCIPLINE'
                    ? 'bg-purple-900/20 border-purple-500/50' 
                    : 'bg-blue-900/20 border-blue-500/50'
                  : 'bg-slate-900 border-slate-700 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={day.isActive} 
                    onChange={() => toggleDay(index)}
                    className={`w-5 h-5 cursor-pointer ${
                      activeTab === 'DISCIPLINE' ? 'accent-purple-500' : 'accent-blue-500'
                    }`}
                  />
                  <span className="font-medium text-white w-28">{day.label}</span>
                </div>

                {day.isActive && (
                  <div className="flex items-center gap-2">
                    <input 
                      type="time" 
                      value={day.startTime}
                      onChange={(e) => changeTime(index, 'startTime', e.target.value)}
                      onBlur={(e) => changeTime(index, 'startTime', e.target.value)}
                      min={activeTab === 'DISCIPLINE' ? '05:00' : undefined}
                      max={activeTab === 'DISCIPLINE' ? '08:00' : undefined}
                      className={`bg-slate-950 text-white border rounded px-3 py-2 outline-none transition-all ${
                        activeTab === 'DISCIPLINE' 
                          ? 'border-purple-500/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                          : 'border-blue-500/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      }`}
                    />
                    <span className="text-slate-500 font-bold">-</span>
                    <input 
                      type="time" 
                      value={day.endTime}
                      onChange={(e) => changeTime(index, 'endTime', e.target.value)}
                      onBlur={(e) => changeTime(index, 'endTime', e.target.value)}
                      min={activeTab === 'DISCIPLINE' ? '05:00' : undefined}
                      max={activeTab === 'DISCIPLINE' ? '08:00' : undefined}
                      className={`bg-slate-950 text-white border rounded px-3 py-2 outline-none transition-all ${
                        activeTab === 'DISCIPLINE' 
                          ? 'border-purple-500/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                          : 'border-blue-500/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      }`}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* BOTÓN DE GUARDAR */}
        <div className="mt-8 pt-6 border-t border-slate-700 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 flex items-center gap-2 ${
              activeTab === 'DISCIPLINE' 
                ? 'bg-purple-600 hover:bg-purple-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Guardar Horario {activeTab === 'DISCIPLINE' ? 'Disciplina' : 'Mentorías'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
