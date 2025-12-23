/**
 * GRANULAR CARTA EDITOR COMPONENT
 * 
 * This component demonstrates the "Partial Rejection" workflow:
 * - Shows carta global status banner
 * - Renders fields with conditional editability
 * - Displays mentor feedback for rejected items
 * - Visual indicators (locks, borders, status badges)
 */

'use client';

import { useState } from 'react';
import { Lock, AlertCircle, CheckCircle, Edit3 } from 'lucide-react';
import {
  isFieldEditable,
  getFieldStatusClass,
  getStatusIndicator,
  getCartaStatusMessage,
  type EstadoCarta,
  type EstadoItem
} from '@/lib/carta-approval-logic';

interface CartaField {
  key: string;
  label: string;
  value: string;
  status: EstadoItem;
  mentorFeedback?: string;
}

interface GranularCartaEditorProps {
  cartaId: number;
  cartaStatus: EstadoCarta;
  declarations: CartaField[];
  metas: CartaField[];
  onSave: (field: string, value: string) => Promise<void>;
  onResubmit: () => Promise<void>;
}

export default function GranularCartaEditor({
  cartaId,
  cartaStatus,
  declarations,
  metas,
  onSave,
  onResubmit
}: GranularCartaEditorProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const statusMessage = getCartaStatusMessage(cartaStatus);

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues({ ...fieldValues, [key]: value });
  };

  const handleSaveField = async (key: string) => {
    await onSave(key, fieldValues[key]);
    setEditingField(null);
  };

  const renderField = (field: CartaField, type: 'declaration' | 'meta') => {
    const isEditable = isFieldEditable(cartaStatus, field.status);
    const statusClass = getFieldStatusClass(field.status);
    const { icon, label: statusLabel, color } = getStatusIndicator(field.status);
    const currentValue = fieldValues[field.key] ?? field.value;
    const isEditing = editingField === field.key;

    return (
      <div key={field.key} className="bg-slate-900 rounded-xl p-5 border-2 border-slate-800">
        {/* Header: Label + Status */}
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-slate-300 uppercase tracking-wide">
            {field.label}
          </label>
          <div className={`flex items-center gap-2 text-xs font-mono ${color}`}>
            <span>{icon}</span>
            <span>{statusLabel}</span>
          </div>
        </div>

        {/* Mentor Feedback (if rejected) */}
        {field.status === 'REJECTED' && field.mentorFeedback && (
          <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-red-300">
              <span className="font-bold">Mentor: </span>
              {field.mentorFeedback}
            </div>
          </div>
        )}

        {/* Field Input/Display */}
        <div className="relative">
          {isEditable ? (
            <div className="space-y-2">
              <textarea
                value={currentValue}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                disabled={!isEditing && field.status === 'APPROVED'}
                className={`w-full px-4 py-3 rounded-lg text-sm resize-none h-24 ${statusClass} 
                          focus:outline-none focus:ring-2 focus:ring-cyan-500
                          disabled:cursor-not-allowed disabled:opacity-70
                          transition-all`}
                placeholder={`Escribe tu ${type === 'declaration' ? 'declaración' : 'meta'}...`}
              />
              {isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveField(field.key)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingField(null)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
              {!isEditing && field.status !== 'APPROVED' && (
                <button
                  onClick={() => setEditingField(field.key)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  <Edit3 size={14} />
                  Editar
                </button>
              )}
            </div>
          ) : (
            <div className={`px-4 py-3 rounded-lg text-sm ${statusClass} relative`}>
              {field.status === 'APPROVED' && (
                <div className="absolute top-2 right-2">
                  <Lock size={16} className="text-green-400/50" />
                </div>
              )}
              <p className="whitespace-pre-wrap">{currentValue || '(Sin definir)'}</p>
            </div>
          )}
        </div>

        {/* Locked Message */}
        {!isEditable && cartaStatus === 'EN_REVISION' && (
          <p className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
            <Lock size={12} />
            En revisión por tu mentor
          </p>
        )}
        {!isEditable && cartaStatus === 'APROBADA' && (
          <p className="mt-2 text-xs text-green-400 flex items-center gap-1">
            <CheckCircle size={12} />
            Aprobado y bloqueado
          </p>
        )}
      </div>
    );
  };

  const hasRejectedItems = [...declarations, ...metas].some(f => f.status === 'REJECTED');
  const canResubmit = cartaStatus === 'CAMBIOS_REQUERIDOS' && hasRejectedItems;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Global Status Banner */}
      <div className={`bg-gradient-to-r from-slate-900 to-slate-800 border-2 rounded-2xl p-6 ${
        cartaStatus === 'APROBADA' ? 'border-green-500/50' :
        cartaStatus === 'CAMBIOS_REQUERIDOS' ? 'border-orange-500/50' :
        cartaStatus === 'EN_REVISION' ? 'border-yellow-500/50' :
        'border-slate-700'
      }`}>
        <div className="flex items-start gap-4">
          <div className="text-4xl">{statusMessage.icon}</div>
          <div className="flex-1">
            <h2 className={`text-xl font-black ${statusMessage.color} mb-1`}>
              {statusMessage.message}
            </h2>
            {statusMessage.action && (
              <p className="text-sm text-slate-400">{statusMessage.action}</p>
            )}
          </div>
        </div>
      </div>

      {/* Declarations Section */}
      <div>
        <h3 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
          <span>💎</span> Declaraciones del Ser
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {declarations.map(field => renderField(field, 'declaration'))}
        </div>
      </div>

      {/* Metas Section */}
      <div>
        <h3 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
          <span>🎯</span> Metas Principales
        </h3>
        <div className="space-y-4">
          {metas.map(field => renderField(field, 'meta'))}
        </div>
      </div>

      {/* Resubmit Button */}
      {canResubmit && (
        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-6">
          <p className="text-sm text-slate-300 mb-4">
            Has corregido los campos rechazados. Puedes reenviar tu carta para una nueva revisión.
          </p>
          <button
            onClick={onResubmit}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-black py-4 rounded-xl transition-all hover:scale-[1.02]"
          >
            🚀 Reenviar para Revisión
          </button>
        </div>
      )}
    </div>
  );
}
