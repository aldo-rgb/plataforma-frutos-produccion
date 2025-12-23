'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, AlertCircle, BrainCircuit } from 'lucide-react';
import { validateMetaSMART } from '@/lib/validaciones-carta';

interface Meta {
  id: string;
  description: string;
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

interface MetaInputDynamicProps {
  areaKey: string;
  areaName: string;
  areaEmoji: string;
  metas?: Meta[];
  onMetasChange?: (metas: Meta[]) => void;
  initialMetas?: Meta[];
  onChange?: (metas: Meta[]) => void;
  disabled?: boolean;
  isReadOnly?: boolean;
  placeholder?: string;
  maxMetas?: number;
  validateFunction?: (text: string) => boolean;
  errorMessage?: string;
  customValidationMessages?: {
    tooShort?: string;
    weakWords?: string;
    tooFewWords?: string;
  };
  label?: string;
}

export default function MetaInputDynamic({
  areaKey,
  areaName,
  areaEmoji,
  metas: controlledMetas,
  onMetasChange,
  initialMetas = [],
  onChange,
  disabled = false,
  isReadOnly = false,
  placeholder = "Escribe tu meta aquí...",
  maxMetas = 5,
  validateFunction,
  errorMessage = "La meta debe cumplir con los criterios de validación",
  customValidationMessages,
  label = "Meta"
}: MetaInputDynamicProps) {
  const [localMetas, setLocalMetas] = useState<Meta[]>(initialMetas);
  const [currentInput, setCurrentInput] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [specificError, setSpecificError] = useState<string | null>(null);

  // Use controlled metas if provided, otherwise use local state
  const metas = controlledMetas !== undefined ? controlledMetas : localMetas;
  const updateMetas = controlledMetas !== undefined ? onMetasChange : (newMetas: Meta[]) => {
    setLocalMetas(newMetas);
    onChange?.(newMetas);
  };

  // Validar input actual en tiempo real
  let validation: { valid: boolean; error?: string; suggestion?: string; message?: string } | null = null;
  let realtimeError: string | null = null;
  
  if (currentInput.trim()) {
    if (validateFunction) {
      const isValid = validateFunction(currentInput);
      
      // Detectar error específico en tiempo real
      if (!isValid) {
        const text = currentInput.toLowerCase();
        
        if (text.includes('tratar') || text.includes('intento') || text.includes('intentar')) {
          realtimeError = "🛑 Elimina 'tratar' o 'intentar'. En este programa no intentamos, lo hacemos. Usa un verbo directo.";
        } else if (text.includes('espero') || text.includes('esperar') || text.includes('ojalá')) {
          realtimeError = "🛑 No lo dejes a la suerte. Define qué harás tú para lograrlo.";
        } else if (text.includes('quisiera') || text.includes('gustaría') || text.includes('desearía')) {
          realtimeError = "🛑 Cámbialo a una afirmación. No es un sueño, es un objetivo.";
        } else if (text.includes('creo') || text.includes('tal vez') || text.includes('quizás') || text.includes('quizá') || text.includes('posible')) {
          realtimeError = "🛑 Elimina la duda. Comprométete con certeza.";
        } else if (text.includes('poco') || text.includes('algo') || text.includes('más o menos')) {
          realtimeError = "🛑 Define una cantidad exacta. 'Algo' no se puede medir.";
        } else if (currentInput.length < 15) {
          realtimeError = "Necesitas ser más específico (mínimo 15 caracteres).";
        } else if (currentInput.trim().split(/\s+/).length < 3) {
          realtimeError = "Agrega más detalle (mínimo 3 palabras).";
        }
      }
      
      validation = { 
        valid: isValid, 
        message: realtimeError || errorMessage 
      };
    } else {
      validation = validateMetaSMART(currentInput);
    }
  }

  const handleAddMeta = () => {
    if (!currentInput.trim()) return;

    let isValid = false;
    let validationError: string | null = null;

    // Use custom validation if provided
    if (validateFunction) {
      isValid = validateFunction(currentInput);
      
      // Detect which specific rule failed for custom error messages
      if (!isValid && customValidationMessages) {
        const text = currentInput.toLowerCase();
        
        // COACH ANTI-EXCUSAS: Detectar palabras débiles específicas con feedback personalizado
        if (text.includes('tratar') || text.includes('intento') || text.includes('intentar')) {
          validationError = "🛑 Elimina la palabra 'tratar' o 'intentar'. Eso programa tu mente para fallar. Usa un verbo de acción directa (Ej: 'Vender', 'Correr', 'Ahorrar').";
        } else if (text.includes('espero') || text.includes('esperar') || text.includes('ojalá')) {
          validationError = "🛑 La esperanza no es una estrategia. No escribas lo que esperas que pase, escribe lo que tú vas a hacer que pase.";
        } else if (text.includes('quisiera') || text.includes('gustaría') || text.includes('desearía')) {
          validationError = "🛑 No estamos pidiendo deseos al universo. Escribe en presente y con certeza: 'Voy a...' o 'Tengo...'.";
        } else if (text.includes('creo') || text.includes('tal vez') || text.includes('quizás') || text.includes('quizá') || text.includes('posible')) {
          validationError = "🛑 Veo duda en tu declaración. Elimina la incertidumbre. Comprométete con un resultado exacto.";
        } else if (text.includes('poco') || text.includes('algo') || text.includes('más o menos')) {
          validationError = "🛑 Sé específico. 'Algo' o 'un poco' no se puede medir. Define una cantidad exacta.";
        } else if (currentInput.length < 15) {
          validationError = customValidationMessages.tooShort || "Tu objetivo es muy corto. Sé más específico sobre qué quieres lograr (mínimo 15 caracteres).";
        } else if (currentInput.trim().split(/\s+/).length < 3) {
          validationError = customValidationMessages.tooFewWords || "Tu objetivo necesita más detalle. Incluye al menos 3 palabras que describan qué quieres lograr.";
        } else {
          validationError = errorMessage;
        }
      } else if (!isValid) {
        validationError = errorMessage;
      }
    } else {
      // Use default SMART validation
      const smartValidation = validateMetaSMART(currentInput);
      isValid = smartValidation.valid;
      if (!isValid) {
        validationError = smartValidation.error || errorMessage;
      }
    }

    if (!isValid) {
      setShowValidation(true);
      setSpecificError(validationError);
      return;
    }

    const newMeta: Meta = {
      id: `${areaKey}-${Date.now()}`,
      description: currentInput.trim(),
      isValid: true
    };

    const newMetas = [...metas, newMeta];
    updateMetas?.(newMetas);
    setCurrentInput("");
    setShowValidation(false);
    setSpecificError(null);
  };

  const handleRemoveMeta = (id: string) => {
    const updatedMetas = metas.filter(m => m.id !== id);
    updateMetas?.(updatedMetas);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAddMeta();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="text-3xl">{areaEmoji}</div>
        <div>
          <h3 className="text-white font-bold text-lg">{areaName}</h3>
          <p className="text-xs text-gray-400">
            {metas.length === 0 ? `Sin ${label.toLowerCase()}s definidos` : `${metas.length} ${label.toLowerCase()}(s) registrado(s)`}
          </p>
        </div>
      </div>

      {/* Lista de metas agregadas */}
      {metas.length > 0 && (
        <div className="space-y-2">
          {metas.map((meta, index) => (
            <div 
              key={meta.id}
              className="bg-gray-900/50 border border-green-500/30 rounded-lg p-3 flex items-start gap-3 animate-in slide-in-from-top-2"
            >
              <div className="bg-green-500/20 text-green-400 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Check size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium mb-1">{label} {index + 1}</p>
                <p className="text-sm text-gray-300 leading-relaxed">{meta.description}</p>
              </div>
              {!disabled && !isReadOnly && (
                <button
                  onClick={() => handleRemoveMeta(meta.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 rounded-lg transition-all shrink-0"
                  title={`Eliminar ${label.toLowerCase()}`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input para nueva meta */}
      {!disabled && !isReadOnly && metas.length < maxMetas && (
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {metas.length === 0 ? `Define tu primer ${label.toLowerCase()}` : `Agregar otro ${label.toLowerCase()} (opcional)`}
          </label>
          
          <div className="relative">
            <textarea
              value={currentInput}
              onChange={(e) => {
                setCurrentInput(e.target.value);
                setShowValidation(false);
                setSpecificError(null);
              }}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              className={`w-full bg-[#1a1d2d] text-white p-4 rounded-xl border-2 transition-all outline-none h-24 resize-none ${
                showValidation && !validation?.valid ? 'border-red-500 focus:border-red-500' :
                currentInput.trim() && validation?.valid ? 'border-green-500 focus:border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]' :
                'border-gray-700 focus:border-purple-500'
              }`}
            />
            
            {/* Indicador de estado */}
            <div className="absolute top-4 right-4">
              {currentInput.trim() && validation?.valid && (
                <div className="bg-green-500/20 text-green-400 w-8 h-8 rounded-full flex items-center justify-center">
                  <Check size={16} />
                </div>
              )}
              {showValidation && !validation?.valid && (
                <AlertCircle className="text-red-500 animate-pulse" size={20} />
              )}
            </div>
          </div>

          {/* Feedback de validación - Coach Anti-Excusas */}
          {showValidation && !validation?.valid && (
            <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 border-2 border-red-500/50 rounded-lg p-4 flex gap-3 animate-in slide-in-from-top-2 shadow-lg">
              <div className="text-3xl shrink-0">📢</div>
              <div className="flex-1">
                <h4 className="text-orange-400 font-bold text-sm uppercase mb-2 tracking-wide">
                  ⚠️ Corrección de Mentalidad
                </h4>
                {specificError ? (
                  <p className="text-white text-sm leading-relaxed font-medium">
                    {specificError}
                  </p>
                ) : 'error' in validation && validation.error ? (
                  <>
                    <h4 className="text-red-400 font-bold text-sm uppercase mb-1">
                      {validation.error}
                    </h4>
                    {'suggestion' in validation && validation.suggestion && (
                      <p className="text-gray-300 text-sm italic leading-relaxed">
                        {validation.suggestion}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-white text-sm leading-relaxed font-medium">
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Validación en tiempo real (mientras escribe) */}
          {currentInput.trim() && !validation?.valid && !showValidation && realtimeError && (
            <div className="bg-orange-900/20 border border-orange-500/40 rounded-lg p-3 flex gap-2 animate-in fade-in">
              <div className="text-xl shrink-0">⚠️</div>
              <p className="text-orange-300 text-xs leading-relaxed">
                {realtimeError}
              </p>
            </div>
          )}

          {/* Refuerzo positivo */}
          {currentInput.trim() && validation?.valid && (
            <div className="text-green-400 text-xs flex items-center gap-2 font-medium px-2">
              <Check size={12} />
              ✨ {label} poderoso detectado. ¡Eso es compromiso cuántico!
            </div>
          )}

          {/* Botón agregar */}
          <button
            onClick={handleAddMeta}
            disabled={!currentInput.trim() || !validation?.valid}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Plus size={20} />
            {currentInput.trim() && validation?.valid 
              ? `Agregar ${label}` 
              : metas.length === 0 
                ? `Agregar ${label}` 
                : `Agregar Otro ${label}`}
          </button>
        </div>
      )}

      {/* Mensaje cuando se alcanza el máximo */}
      {metas.length >= maxMetas && !isReadOnly && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 text-center">
          <p className="text-sm text-blue-300">
            ✅ Has alcanzado el máximo de {maxMetas} {label.toLowerCase()}s por área
          </p>
        </div>
      )}
    </div>
  );
}
