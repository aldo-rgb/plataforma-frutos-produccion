'use client';

import { useState } from 'react';
import { Check, X, Edit2, MessageSquare, AlertCircle, Sparkles, Lock } from 'lucide-react';

interface AreaReview {
  areaType: string;
  areaName: string;
  identity: string;
  meta: string;
  identityStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  metaStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  identityFeedback?: string;
  metaFeedback?: string;
  color: string;
  emoji: string;
}

interface CartaReviewProps {
  cartaId: number;
  userName: string;
  initialData: AreaReview[];
  onSave: (reviews: AreaReview[]) => Promise<void>;
}

export default function CartaReviewMentor({ cartaId, userName, initialData, onSave }: CartaReviewProps) {
  const [areas, setAreas] = useState<AreaReview[]>(initialData);
  const [editingField, setEditingField] = useState<{ area: string; field: 'identity' | 'meta' } | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const updateAreaStatus = (areaType: string, field: 'identity' | 'meta', status: string) => {
    setAreas(prev => prev.map(area => 
      area.areaType === areaType 
        ? { 
            ...area, 
            [`${field}Status`]: status,
            [`${field}Feedback`]: status === 'APPROVED' ? '' : area[`${field}Feedback`]
          }
        : area
    ));
  };

  const updateFeedback = (areaType: string, field: 'identity' | 'meta', feedback: string) => {
    setAreas(prev => prev.map(area => 
      area.areaType === areaType 
        ? { ...area, [`${field}Feedback`]: feedback }
        : area
    ));
  };

  const startEdit = (areaType: string, field: 'identity' | 'meta', currentValue: string) => {
    setEditingField({ area: areaType, field });
    setTempValue(currentValue);
  };

  const saveEdit = (areaType: string, field: 'identity' | 'meta') => {
    setAreas(prev => prev.map(area => 
      area.areaType === areaType 
        ? { ...area, [field]: tempValue, [`${field}Status`]: 'APPROVED' }
        : area
    ));
    setEditingField(null);
    setTempValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setTempValue('');
  };

  const handleSubmitReview = async () => {
    setSavingReview(true);
    try {
      await onSave(areas);
    } finally {
      setSavingReview(false);
    }
  };

  const getOverallProgress = () => {
    const total = areas.length * 2; // 2 campos por área
    const approved = areas.reduce((count, area) => {
      return count + 
        (area.identityStatus === 'APPROVED' ? 1 : 0) + 
        (area.metaStatus === 'APPROVED' ? 1 : 0);
    }, 0);
    return Math.round((approved / total) * 100);
  };

  const hasChangesRequested = areas.some(area => 
    area.identityStatus === 'REJECTED' || area.metaStatus === 'REJECTED'
  );

  const allApproved = areas.every(area => 
    area.identityStatus === 'APPROVED' && area.metaStatus === 'APPROVED'
  );

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* HEADER CON PROGRESO */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles className="text-purple-400" />
              Revisión de Carta F.R.U.T.O.S.
            </h1>
            <p className="text-gray-300 text-sm">
              Usuario: <strong className="text-purple-300">{userName}</strong>
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{getOverallProgress()}%</div>
            <p className="text-xs text-gray-400">Completado</p>
          </div>
        </div>

        {/* BARRA DE PROGRESO */}
        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 rounded-full"
            style={{ width: `${getOverallProgress()}%` }}
          />
        </div>

        {/* INSTRUCCIONES */}
        <div className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
          <p className="text-xs text-purple-200 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>
              <strong>Instrucciones:</strong> Revisa cada declaración de identidad y meta. Puedes aprobar ✅, 
              editar directamente ✏️ (para correcciones menores), o rechazar ❌ con comentarios específicos.
            </span>
          </p>
        </div>
      </div>

      {/* ÁREAS DE REVISIÓN */}
      <div className="space-y-4">
        {areas.map((area) => (
          <div 
            key={area.areaType}
            className="bg-[#1a1b1f] border-2 border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all"
          >
            {/* HEADER DEL ÁREA */}
            <div 
              className="p-4 flex items-center gap-3"
              style={{ background: `linear-gradient(135deg, ${area.color}15, transparent)` }}
            >
              <div className="text-3xl">{area.emoji}</div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg">{area.areaName}</h3>
                <div className="flex gap-2 mt-1">
                  {area.identityStatus === 'APPROVED' && area.metaStatus === 'APPROVED' && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full flex items-center gap-1">
                      <Check size={12} /> Aprobado
                    </span>
                  )}
                  {(area.identityStatus === 'REJECTED' || area.metaStatus === 'REJECTED') && (
                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full flex items-center gap-1">
                      <X size={12} /> Cambios requeridos
                    </span>
                  )}
                  {area.identityStatus === 'PENDING' || area.metaStatus === 'PENDING' && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                      Pendiente
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* 1. DECLARACIÓN DE IDENTIDAD */}
              <div className="bg-[#252836] p-4 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-400">Declaración de Identidad</label>
                  <div className="flex gap-1">
                    {area.identityStatus !== 'APPROVED' && (
                      <>
                        <button
                          onClick={() => startEdit(area.areaType, 'identity', area.identity)}
                          className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                          title="Editar directamente"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => updateAreaStatus(area.areaType, 'identity', 'APPROVED')}
                          className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
                          title="Aprobar"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => updateAreaStatus(area.areaType, 'identity', 'REJECTED')}
                          className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                          title="Rechazar"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                    {area.identityStatus === 'APPROVED' && (
                      <div className="flex items-center gap-1 text-green-400 text-xs">
                        <Lock size={12} />
                        <span>Aprobado</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CAMPO EDITABLE O TEXTO */}
                {editingField?.area === area.areaType && editingField?.field === 'identity' ? (
                  <div className="space-y-2">
                    <textarea
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="w-full bg-gray-900 border border-purple-500 text-white p-3 rounded-lg resize-none focus:ring-2 focus:ring-purple-500"
                      rows={3}
                      placeholder="Edita la declaración..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(area.areaType, 'identity')}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                      >
                        <Check size={14} /> Guardar
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className={`text-sm leading-relaxed ${
                    area.identityStatus === 'APPROVED' ? 'text-green-300' :
                    area.identityStatus === 'REJECTED' ? 'text-red-300' :
                    'text-gray-300'
                  }`}>
                    "{area.identity}"
                  </p>
                )}

                {/* FEEDBACK DEL MENTOR */}
                {area.identityStatus === 'REJECTED' && (
                  <div className="mt-3 bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                    <label className="text-xs text-red-400 font-medium block mb-1 flex items-center gap-1">
                      <MessageSquare size={12} /> Comentario para el usuario:
                    </label>
                    <textarea
                      value={area.identityFeedback || ''}
                      onChange={(e) => updateFeedback(area.areaType, 'identity', e.target.value)}
                      className="w-full bg-gray-900 border border-red-500/50 text-white p-2 rounded text-xs resize-none focus:ring-2 focus:ring-red-500"
                      rows={2}
                      placeholder="Ejemplo: Usa tiempo presente. Cambia 'seré' por 'soy'..."
                    />
                  </div>
                )}
              </div>

              {/* 2. META SMART */}
              <div className="bg-[#252836] p-4 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-400">Meta SMART</label>
                  <div className="flex gap-1">
                    {area.metaStatus !== 'APPROVED' && (
                      <>
                        <button
                          onClick={() => startEdit(area.areaType, 'meta', area.meta)}
                          className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                          title="Editar directamente"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => updateAreaStatus(area.areaType, 'meta', 'APPROVED')}
                          className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
                          title="Aprobar"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => updateAreaStatus(area.areaType, 'meta', 'REJECTED')}
                          className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                          title="Rechazar"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                    {area.metaStatus === 'APPROVED' && (
                      <div className="flex items-center gap-1 text-green-400 text-xs">
                        <Lock size={12} />
                        <span>Aprobado</span>
                      </div>
                    )}
                  </div>
                </div>

                {editingField?.area === area.areaType && editingField?.field === 'meta' ? (
                  <div className="space-y-2">
                    <textarea
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="w-full bg-gray-900 border border-purple-500 text-white p-3 rounded-lg resize-none focus:ring-2 focus:ring-purple-500"
                      rows={3}
                      placeholder="Edita la meta..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(area.areaType, 'meta')}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                      >
                        <Check size={14} /> Guardar
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className={`text-sm leading-relaxed ${
                    area.metaStatus === 'APPROVED' ? 'text-green-300' :
                    area.metaStatus === 'REJECTED' ? 'text-red-300' :
                    'text-gray-300'
                  }`}>
                    {area.meta}
                  </p>
                )}

                {area.metaStatus === 'REJECTED' && (
                  <div className="mt-3 bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                    <label className="text-xs text-red-400 font-medium block mb-1 flex items-center gap-1">
                      <MessageSquare size={12} /> Comentario para el usuario:
                    </label>
                    <textarea
                      value={area.metaFeedback || ''}
                      onChange={(e) => updateFeedback(area.areaType, 'meta', e.target.value)}
                      className="w-full bg-gray-900 border border-red-500/50 text-white p-2 rounded text-xs resize-none focus:ring-2 focus:ring-red-500"
                      rows={2}
                      placeholder="Ejemplo: Tu meta no es medible. Agrega una cantidad específica..."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* BOTÓN DE ACCIÓN FINAL */}
      <div className="mt-8 bg-[#1a1b1f] border-2 border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold mb-1">
              {allApproved ? '✅ Todo Aprobado' : hasChangesRequested ? '⚠️ Cambios Solicitados' : '📋 Revisión en Progreso'}
            </h3>
            <p className="text-sm text-gray-400">
              {allApproved 
                ? 'La carta será aprobada y se generarán las tareas automáticamente.' 
                : hasChangesRequested
                ? 'El usuario recibirá notificación con tus comentarios.'
                : 'Revisa todos los campos antes de enviar.'}
            </p>
          </div>
          <button
            onClick={handleSubmitReview}
            disabled={savingReview}
            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
              allApproved 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg hover:scale-105' 
                : hasChangesRequested
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:shadow-lg hover:scale-105'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {savingReview ? 'Guardando...' : allApproved ? 'Aprobar y Generar Tareas' : 'Enviar Revisión'}
            {!savingReview && <Check size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
