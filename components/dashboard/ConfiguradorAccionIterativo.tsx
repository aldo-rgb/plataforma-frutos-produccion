'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, Info, Check, Repeat, CalendarDays, Sparkles } from 'lucide-react';
import { extractSmartInfo } from '@/lib/smart-extractor'; // NUEVO: importar extractor

interface FrequencyConfig {
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME';
  selectedDays?: number[]; // Para WEEKLY: [0,1,2,3,4,5,6]
  monthDays?: number[]; // Para MONTHLY: días del mes [1, 15, 30]
  specificDate?: string; // Para ONE_TIME: fecha específica
  deadline?: string; // Alias de specificDate
}

interface ConfiguradorAccionIterativoProps {
  metaDescription: string;
  metaIndex: number;
  totalMetas: number;
  areaName: string;
  areaEmoji: string;
  initialConfig?: FrequencyConfig;
  suggestedConfig?: {
    frequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'UNIQUE';
    days?: number[];
    date?: string;
    confidence?: number;
    suggestion?: string;
  };
  onSave: (config: FrequencyConfig) => void;
  onNext: () => void;
  onPrev?: () => void;
}

export default function ConfiguradorAccionIterativo({
  metaDescription,
  metaIndex,
  totalMetas,
  areaName,
  areaEmoji,
  initialConfig,
  suggestedConfig,
  onSave,
  onNext,
  onPrev
}: ConfiguradorAccionIterativoProps) {
  // 🔍 DEBUG: Ver qué suggestedConfig recibimos
  console.log('🔍 ConfiguradorAccionIterativo recibió:', {
    metaDescription,
    suggestedConfig,
    metaIndex,
    totalMetas
  });

  // Mapear UNIQUE a ONE_TIME
  const mapFrequency = (freq?: string): FrequencyConfig['type'] | null => {
    if (freq === 'UNIQUE') return 'ONE_TIME';
    if (freq === 'DAILY' || freq === 'WEEKLY' || freq === 'BIWEEKLY' || freq === 'MONTHLY' || freq === 'ONE_TIME') {
      return freq;
    }
    return null;
  };

  // Estado inicial - usar sugerencia si está disponible
  const inicialHabitType = suggestedConfig?.frequency === 'UNIQUE' ? 'ONE_TIME' : 
    suggestedConfig?.frequency ? 'RECURRING' : null;
  const inicialFrequencyType = mapFrequency(suggestedConfig?.frequency);
  
  console.log('🎯 Valores iniciales calculados:', {
    inicialHabitType,
    inicialFrequencyType,
    suggestedFrequency: suggestedConfig?.frequency
  });
  
  const [habitType, setHabitType] = useState<'RECURRING' | 'ONE_TIME' | null>(
    inicialHabitType
  );
  const [frequencyType, setFrequencyType] = useState<FrequencyConfig['type'] | null>(
    inicialFrequencyType
  );
  const [selectedDays, setSelectedDays] = useState<number[]>(
    suggestedConfig?.days || []
  );
  const [monthDays, setMonthDays] = useState<number[]>([]);
  const [monthDay, setMonthDay] = useState<number>(1);
  const [deadline, setDeadline] = useState<string>('');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  // 🚀 FALLBACK: Si no hay suggestedConfig, analizar la descripción directamente
  useEffect(() => {
    if (!suggestedConfig && metaDescription && !habitType && !frequencyType) {
      console.log('🔄 FALLBACK: Analizando descripción directamente:', metaDescription);
      const extracted = extractSmartInfo(metaDescription);
      
      if (extracted.frequency && extracted.confidence >= 70) {
        console.log('✅ Frecuencia detectada en fallback:', extracted);
        
        if (extracted.frequency === 'UNIQUE') {
          setHabitType('ONE_TIME');
          setFrequencyType('ONE_TIME');
          if (extracted.detectedDate) {
            setDeadline(extracted.detectedDate);
          }
        } else {
          setHabitType('RECURRING');
          setFrequencyType(extracted.frequency);
          if (extracted.detectedDays) {
            setSelectedDays(extracted.detectedDays);
          }
        }
      }
    }
  }, [metaDescription, suggestedConfig, habitType, frequencyType]);

  // Cargar configuración inicial si existe
  useEffect(() => {
    if (initialConfig) {
      setFrequencyType(initialConfig.type);
      if (initialConfig.type === 'ONE_TIME') {
        setHabitType('ONE_TIME');
        setDeadline(initialConfig.deadline || '');
      } else {
        setHabitType('RECURRING');
        setSelectedDays(initialConfig.selectedDays || []);
        setMonthDays(initialConfig.monthDays || []);
        setMonthDay(initialConfig.monthDay || 1);
      }
    }
  }, [initialConfig]);

  const diasSemana = [
    { id: 0, label: 'Dom', name: 'Domingo' },
    { id: 1, label: 'Lun', name: 'Lunes' },
    { id: 2, label: 'Mar', name: 'Martes' },
    { id: 3, label: 'Mié', name: 'Miércoles' },
    { id: 4, label: 'Jue', name: 'Jueves' },
    { id: 5, label: 'Vie', name: 'Viernes' },
    { id: 6, label: 'Sáb', name: 'Sábado' }
  ];

  const toggleDia = (id: number) => {
    if (selectedDays.includes(id)) {
      setSelectedDays(selectedDays.filter(d => d !== id));
    } else {
      setSelectedDays([...selectedDays, id].sort());
    }
  };

  const calcularTareasTotales = () => {
    // Calcular basado en días seleccionados del mes
    // Aproximadamente 3 meses en un ciclo de 100 días
    return (monthDays?.length || 0) * 3;
  };

  const canProceed = () => {
    if (!habitType || !frequencyType) return false;
    
    if (frequencyType === 'DAILY') return true;
    if (frequencyType === 'WEEKLY') return selectedDays.length > 0;
    if (frequencyType === 'MONTHLY') return monthDays.length > 0;
    if (frequencyType === 'ONE_TIME') return !!deadline;
    
    return false;
  };

  const handleGuardarYContinuar = async () => {
    setGuardando(true);
    setGuardado(false);

    const config: FrequencyConfig = {
      type: frequencyType!,
      selectedDays: frequencyType === 'WEEKLY' ? selectedDays : undefined,
      monthDays: frequencyType === 'MONTHLY' ? monthDays : undefined,
      specificDate: frequencyType === 'ONE_TIME' ? deadline : undefined,
      deadline: frequencyType === 'ONE_TIME' ? deadline : undefined
    };

    onSave(config);
    
    // Simular guardado breve
    await new Promise(resolve => setTimeout(resolve, 400));
    setGuardando(false);
    setGuardado(true);
    
    // Esperar un poco antes de continuar para mostrar el checkmark
    await new Promise(resolve => setTimeout(resolve, 600));
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Header con progreso */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{areaEmoji}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-white font-bold text-xl">{areaName}</h2>
              <span className="bg-purple-600/30 text-purple-300 text-xs font-bold px-3 py-1 rounded-full">
                Meta {metaIndex} de {totalMetas}
              </span>
            </div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 mb-3">
              <p className="text-sm text-gray-300 italic leading-relaxed">"{metaDescription}"</p>
            </div>
            <p className="text-sm text-purple-300">
              💡 Define con qué frecuencia trabajarás esta meta
            </p>
          </div>
        </div>
      </div>

      {/* Sugerencia Inteligente si existe */}
      {suggestedConfig && suggestedConfig.confidence && suggestedConfig.confidence >= 70 && (
        <div className="bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 border-2 border-blue-500/50 rounded-xl p-4 animate-in slide-in-from-top-3">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🤖</div>
            <div className="flex-1">
              <h4 className="text-blue-300 font-bold text-sm mb-2 flex items-center gap-2">
                <Sparkles size={16} />
                Configuración Sugerida
              </h4>
              <p className="text-white text-sm leading-relaxed mb-3">
                {suggestedConfig.suggestion || 'Hemos pre-configurado esta meta basándonos en tu descripción.'}
              </p>
              <p className="text-xs text-gray-400">
                ℹ️ Puedes modificar la configuración si lo necesitas
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PASO 1: Tipo de Hábito */}
      <div className="bg-[#1a1b1f] border-2 border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Repeat className="text-purple-400" size={20} />
          <h3 className="text-white font-bold">Paso 1: ¿Qué tipo de compromiso es este?</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => {
              setHabitType('RECURRING');
              setFrequencyType(null);
            }}
            className={`p-6 rounded-xl border-2 text-left transition-all hover:scale-105 ${
              habitType === 'RECURRING'
                ? 'bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/30'
                : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">🔄</div>
            <div className={`font-bold text-sm mb-1 ${habitType === 'RECURRING' ? 'text-white' : 'text-gray-300'}`}>
              Hábito Recurrente
            </div>
            <div className="text-xs text-gray-400">
              Leer, Ejercicio, Ahorrar, etc.
            </div>
          </button>

          <button
            onClick={() => {
              setHabitType('ONE_TIME');
              setFrequencyType('ONE_TIME');
            }}
            className={`p-6 rounded-xl border-2 text-left transition-all hover:scale-105 ${
              habitType === 'ONE_TIME'
                ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/30'
                : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">🎯</div>
            <div className={`font-bold text-sm mb-1 ${habitType === 'ONE_TIME' ? 'text-white' : 'text-gray-300'}`}>
              Acción Única
            </div>
            <div className="text-xs text-gray-400">
              Comprar seguro, Abrir cuenta, etc.
            </div>
          </button>
        </div>
      </div>

      {/* PASO 2: Configuración según tipo */}
      {habitType === 'RECURRING' && (
        <div className="bg-[#1a1b1f] border-2 border-gray-800 rounded-xl p-6 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="text-purple-400" size={20} />
            <h3 className="text-white font-bold">Paso 2: Selecciona la frecuencia</h3>
          </div>

          {/* Selector de tipo de frecuencia */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <button
              onClick={() => setFrequencyType('DAILY')}
              className={`p-4 rounded-xl border-2 text-center transition-all hover:scale-105 ${
                frequencyType === 'DAILY'
                  ? 'bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/30'
                  : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="text-3xl mb-2">🔥</div>
              <div className={`font-bold text-sm ${frequencyType === 'DAILY' ? 'text-white' : 'text-gray-300'}`}>
                Diario
              </div>
              <div className="text-xs text-gray-400">Todos los días</div>
            </button>

            <button
              onClick={() => setFrequencyType('WEEKLY')}
              className={`p-4 rounded-xl border-2 text-center transition-all hover:scale-105 ${
                frequencyType === 'WEEKLY'
                  ? 'bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/30'
                  : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="text-3xl mb-2">📅</div>
              <div className={`font-bold text-sm ${frequencyType === 'WEEKLY' ? 'text-white' : 'text-gray-300'}`}>
                Semanal
              </div>
              <div className="text-xs text-gray-400">Días específicos</div>
            </button>

            <button
              onClick={() => setFrequencyType('MONTHLY')}
              className={`p-4 rounded-xl border-2 text-center transition-all hover:scale-105 ${
                frequencyType === 'MONTHLY'
                  ? 'bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/30'
                  : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="text-3xl mb-2">📆</div>
              <div className={`font-bold text-sm ${frequencyType === 'MONTHLY' ? 'text-white' : 'text-gray-300'}`}>
                Mensual
              </div>
              <div className="text-xs text-gray-400">1 vez al mes</div>
            </button>

            <button
              onClick={() => {
                setFrequencyType('ONE_TIME');
                setHabitType('ONE_TIME');
              }}
              className={`p-4 rounded-xl border-2 text-center transition-all hover:scale-105 ${
                frequencyType === 'ONE_TIME'
                  ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/30'
                  : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="text-3xl mb-2">🎯</div>
              <div className={`font-bold text-sm ${frequencyType === 'ONE_TIME' ? 'text-white' : 'text-gray-300'}`}>
                1 sola vez
              </div>
              <div className="text-xs text-gray-400">Acción única</div>
            </button>
          </div>

          {/* Configuración DIARIA */}
          {frequencyType === 'DAILY' && (
            <div className="bg-gradient-to-br from-orange-900/40 to-red-900/40 p-6 rounded-xl border-2 border-orange-500/50">
              <div className="flex items-start gap-4 mb-4">
                <div className="text-4xl">📸</div>
                <div className="flex-1">
                  <p className="text-white font-bold text-lg mb-2">⚠️ Compromiso de Evidencia Diaria</p>
                  <p className="text-orange-100 text-sm mb-3">
                    Al elegir frecuencia DIARIA, te comprometes a:
                  </p>
                  <ul className="space-y-2 text-orange-200 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400 font-bold">•</span>
                      <span>Tomar una <strong>fotografía cada día</strong> como evidencia de que completaste la acción</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400 font-bold">•</span>
                      <span>Subir la foto el mismo día de la actividad</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400 font-bold">•</span>
                      <span>No podrás marcar como "completada" sin evidencia fotográfica</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-black/30 rounded-lg p-4 border border-orange-500/30">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🔥</div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">Esta es una acción de alto compromiso</p>
                    <p className="text-gray-300 text-xs mt-1">
                      Se ejecutará <span className="text-orange-300 font-bold">todos los días</span> y requerirá evidencia fotográfica diaria
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-orange-200 text-xs">
                <span>💡</span>
                <span className="italic">
                  Si no puedes tomar fotos diariamente, considera elegir frecuencia Semanal o Mensual
                </span>
              </div>
            </div>
          )}

          {/* Configuración SEMANAL */}
          {frequencyType === 'WEEKLY' && (
            <div className="bg-[#252836] p-5 rounded-xl border border-gray-700">
              <label className="text-gray-300 text-sm font-medium block mb-3">
                📅 Selecciona los días de la semana:
              </label>
              
              <div className="grid grid-cols-7 gap-2">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((dia, idx) => {
                  const isSelected = selectedDays.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedDays(selectedDays.filter(d => d !== idx));
                        } else {
                          setSelectedDays([...selectedDays, idx].sort());
                        }
                      }}
                      className={`p-3 rounded-lg font-bold text-xs transition-all ${
                        isSelected
                          ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-lg scale-105'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>

              {selectedDays.length > 0 && (
                <div className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                  <p className="text-purple-300 text-sm">
                    ✓ {selectedDays.length} día{selectedDays.length > 1 ? 's' : ''} seleccionado{selectedDays.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Configuración MENSUAL */}
          {frequencyType === 'MONTHLY' && (
            <div className="bg-[#252836] p-5 rounded-xl border border-gray-700">
              <label className="text-gray-300 text-sm font-medium block mb-3">
                📅 Selecciona uno o varios días del mes:
              </label>
              
              <div className="grid grid-cols-7 gap-2">
                {[...Array(31)].map((_, i) => {
                  const dia = i + 1;
                  const isSelected = (monthDays || []).includes(dia);
                  
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => {
                        const currentDays = monthDays || [];
                        if (isSelected) {
                          setMonthDays(currentDays.filter(d => d !== dia));
                        } else {
                          setMonthDays([...currentDays, dia].sort((a, b) => a - b));
                        }
                      }}
                      className={`h-10 rounded-lg font-bold text-sm transition-all ${
                        isSelected
                          ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-lg scale-105'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>

              {monthDays && monthDays.length > 0 && (
                <div className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                  <p className="text-purple-300 text-sm font-medium mb-2">
                    ✓ Días seleccionados: {monthDays.length}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {monthDays.map(dia => (
                      <span key={dia} className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                        Día {dia}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PASO 2 (Alternativo): Para ONE_TIME - Fecha límite */}
      {habitType === 'ONE_TIME' && (
        <div className="bg-[#1a1b1f] border-2 border-gray-800 rounded-xl p-6 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-blue-400" size={20} />
            <h3 className="text-white font-bold">Paso 2: ¿Para cuándo debe estar completada?</h3>
          </div>

          <div className="bg-[#252836] p-5 rounded-xl border border-gray-700">
            <label className="text-gray-300 text-sm font-medium block mb-3">
              📆 Fecha límite:
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      )}

      {/* Resumen y botones */}
      {canProceed() && (
        <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3 mb-4">
            <Info className="text-purple-400 shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-sm font-bold text-white mb-1">Resumen de tu compromiso:</p>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Meta: <span className="text-purple-300">{metaDescription.substring(0, 50)}...</span></li>
                <li>• Tipo: <span className="text-purple-300">{habitType === 'RECURRING' ? 'Hábito Recurrente' : 'Acción Única'}</span></li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            {onPrev && (
              <button
                onClick={onPrev}
                className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2"
              >
                ← Acción Anterior
              </button>
            )}
            <button
              onClick={handleGuardarYContinuar}
              disabled={guardando}
              className={`flex-1 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
                guardado 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:scale-105'
              } disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {guardando ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : guardado ? (
                <>
                  <Check size={20} className="animate-in zoom-in" />
                  ¡Guardado!
                </>
              ) : (
                <>
                  <Check size={20} />
                  {metaIndex < totalMetas ? 'Guardar y Siguiente Acción →' : 'Guardar y Finalizar'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
