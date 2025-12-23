'use client';

import { useState } from 'react';
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
  initialMetas?: Meta[];
  onChange: (metas: Meta[]) => void;
  disabled?: boolean;
}

export default function MetaInputDynamic({ 
  areaKey, 
  areaName, 
  areaEmoji, 
  initialMetas = [],
  onChange,
  disabled = false
}: MetaInputDynamicProps) {
  const [metas, setMetas] = useState<Meta[]>(initialMetas);
  const [currentInput, setCurrentInput] = useState('');
  const [showValidation, setShowValidation] = useState(false);

  // Validar input actual en tiempo real
  const validation = currentInput.trim() ? validateMetaSMART(currentInput) : null;

  const handleAddMeta = () => {
    if (!currentInput.trim()) return;

    // Validar antes de agregar
    const validation = validateMetaSMART(currentInput);
    if (!validation.valid) {
      setShowValidation(true);
      return;
    }

    const newMeta: Meta = {
      id: `${areaKey}-${Date.now()}`,
      description: currentInput.trim(),
      isValid: true
    };

    const updatedMetas = [...metas, newMeta];
    setMetas(updatedMetas);
    onChange(updatedMetas);
    setCurrentInput('');
    setShowValidation(false);
  };

  const handleRemoveMeta = (id: string) => {
    const updatedMetas = metas.filter(m => m.id !== id);
    setMetas(updatedMetas);
    onChange(updatedMetas);
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
            {metas.length === 0 ? 'Sin metas definidas' : `${metas.length} meta(s) registrada(s)`}
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
                <p className="text-sm text-white font-medium mb-1">Meta {index + 1}</p>
                <p className="text-sm text-gray-300 leading-relaxed">{meta.description}</p>
              </div>
              {!disabled && (
                <button
                  onClick={() => handleRemoveMeta(meta.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 rounded-lg transition-all shrink-0"
                  title="Eliminar meta"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input para nueva meta */}
      {!disabled && (
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {metas.length === 0 ? 'Define tu primera meta' : 'Agregar otra meta (opcional)'}
          </label>
          
          <div className="relative">
            <textarea
              value={currentInput}
              onChange={(e) => {
                setCurrentInput(e.target.value);
                setShowValidation(false);
              }}
              onKeyPress={handleKeyPress}
              placeholder="Ej: Generar $50,000 en ventas de nuevos clientes durante los próximos 90 días"
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

          {/* Feedback de validación */}
          {showValidation && !validation?.valid && validation?.error && (
            <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 flex gap-3 animate-in slide-in-from-top-2">
              <BrainCircuit className="text-red-400 shrink-0 mt-1" size={20} />
              <div>
                <h4 className="text-red-400 font-bold text-sm uppercase mb-1">
                  {validation.error}
                </h4>
                <p className="text-gray-300 text-sm italic leading-relaxed">
                  {validation.suggestion}
                </p>
              </div>
            </div>
          )}

          {/* Refuerzo positivo */}
          {currentInput.trim() && validation?.valid && (
            <div className="text-green-400 text-xs flex items-center gap-2 font-medium px-2">
              <Check size={12} />
              ✨ Declaración poderosa detectada. ¡Eso es compromiso cuántico!
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
              ? 'Agregar Meta' 
              : metas.length === 0 
                ? 'Agregar Meta' 
                : 'Agregar Otra Meta'}
          </button>
        </div>
      )}

      {/* Mensaje de área completa */}
      {disabled && metas.length > 0 && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-center">
          <p className="text-green-400 text-sm font-medium">
            ✅ Área completada y aprobada
          </p>
        </div>
      )}
    </div>
  );
}
