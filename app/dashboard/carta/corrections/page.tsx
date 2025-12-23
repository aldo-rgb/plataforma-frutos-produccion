'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Check, Lock, RefreshCw, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const AREAS = [
  { key: 'finanzas', name: 'FINANZAS', emoji: '💰' },
  { key: 'relaciones', name: 'RELACIONES', emoji: '❤️' },
  { key: 'talentos', name: 'TALENTOS', emoji: '🎨' },
  { key: 'salud', name: 'SALUD', emoji: '💪' },
  { key: 'pazMental', name: 'PAZ MENTAL', emoji: '🧘' },
  { key: 'ocio', name: 'OCIO', emoji: '🎮' },
  { key: 'servicioTrans', name: 'SERVICIO TRANSFORMACIONAL', emoji: '🌟' },
  { key: 'servicioComun', name: 'SERVICIO COMUNITARIO', emoji: '🤝' }
];

interface FieldStatus {
  value: string;
  status: 'approved' | 'rejected' | 'pending';
  feedback?: string;
}

export default function CorrectionsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cartaData, setCartaData] = useState<any>(null);
  const [editedData, setEditedData] = useState<any>({});
  const [feedback, setFeedback] = useState<any>({});

  useEffect(() => {
    loadCarta();
  }, []);

  const loadCarta = async () => {
    try {
      const res = await fetch('/api/carta/my-carta');
      const data = await res.json();
      
      if (data.carta) {
        setCartaData(data.carta);
        setEditedData(data.carta);
        
        // Parsear feedback del mentor
        if (data.carta.feedbackMentor) {
          parseFeedback(data.carta.feedbackMentor);
        }
      }
    } catch (error) {
      console.error('Error loading carta:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseFeedback = (feedbackText: string) => {
    const lines = feedbackText.split('\n');
    const parsed: any = {};
    
    lines.forEach(line => {
      if (line.includes('✅')) {
        // Campo aprobado
        const match = line.match(/✅\s+([A-Z_\s]+)\s+-\s+(Identidad|Meta)/);
        if (match) {
          const area = match[1].trim();
          const field = match[2].toLowerCase();
          parsed[`${area}_${field}`] = { status: 'approved' };
        }
      } else if (line.includes('❌')) {
        // Campo rechazado
        const match = line.match(/❌\s+([A-Z_\s]+)\s+-\s+(Identidad|Meta):\s+(.+)/);
        if (match) {
          const area = match[1].trim();
          const field = match[2].toLowerCase();
          const message = match[3].trim();
          parsed[`${area}_${field}`] = { status: 'rejected', feedback: message };
        }
      }
    });
    
    setFeedback(parsed);
  };

  const getFieldStatus = (areaName: string, fieldType: 'identity' | 'meta'): 'approved' | 'rejected' | 'pending' => {
    const key = `${areaName}_${fieldType === 'identity' ? 'identidad' : 'meta'}`;
    return feedback[key]?.status || 'pending';
  };

  const getFieldFeedback = (areaName: string, fieldType: 'identity' | 'meta'): string | undefined => {
    const key = `${areaName}_${fieldType === 'identity' ? 'identidad' : 'meta'}`;
    return feedback[key]?.feedback;
  };

  const handleFieldChange = (fieldKey: string, value: string) => {
    setEditedData({ ...editedData, [fieldKey]: value });
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await fetch('/api/carta/my-carta', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedData)
      });
      alert('✅ Cambios guardados');
    } catch (error) {
      console.error('Error saving:', error);
      alert('❌ Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const resubmit = async () => {
    setSubmitting(true);
    try {
      // Primero guardar cambios
      await saveChanges();
      
      // Luego reenviar
      const res = await fetch('/api/carta/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartaId: cartaData.id })
      });

      const data = await res.json();
      
      if (data.success) {
        alert(`✅ ${data.message}`);
        await loadCarta();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error resubmitting:', error);
      alert('❌ Error al reenviar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1015]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!cartaData || cartaData.estado !== 'CAMBIOS_SOLICITADOS') {
    return (
      <div className="min-h-screen bg-[#0f1015] p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              No hay correcciones pendientes
            </h2>
            <p className="text-gray-400 mb-6">
              Tu carta no está en estado de "Cambios Solicitados"
            </p>
            <Link
              href="/dashboard/carta/wizard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all"
            >
              <ArrowLeft size={20} />
              Volver al Wizard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Contar campos rechazados
  const rejectedCount = Object.values(feedback).filter((f: any) => f.status === 'rejected').length;

  return (
    <div className="min-h-screen bg-[#0f1015] pb-20">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-b border-orange-500/30 sticky top-0 z-50 backdrop-blur-lg">
        <div className="max-w-5xl mx-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <AlertCircle className="text-orange-400" />
                Correcciones Solicitadas
              </h1>
              <p className="text-sm text-gray-400">
                Tu mentor revisó tu carta y solicitó algunos ajustes
              </p>
            </div>

            <Link
              href="/dashboard/carta/wizard"
              className="px-4 py-2 bg-gray-800 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-gray-700 transition-all"
            >
              <ArrowLeft size={16} />
              Volver
            </Link>
          </div>

          {/* Resumen */}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            <p className="text-sm text-orange-200 font-bold mb-2">
              📋 Tienes {rejectedCount} campo{rejectedCount !== 1 ? 's' : ''} para corregir
            </p>
            <p className="text-xs text-orange-300">
              Los campos en <span className="bg-red-500/30 px-2 py-0.5 rounded">rojo</span> necesitan cambios. 
              Los campos en <span className="bg-green-500/30 px-2 py-0.5 rounded">verde</span> ya están aprobados y no se pueden editar.
            </p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {AREAS.map((area) => {
          const identityKey = `${area.key}Declaracion`;
          const metaKey = `${area.key}Meta`;
          
          const identityStatus = getFieldStatus(area.name, 'identity');
          const metaStatus = getFieldStatus(area.name, 'meta');
          
          const identityFeedback = getFieldFeedback(area.name, 'identity');
          const metaFeedback = getFieldFeedback(area.name, 'meta');

          // Solo mostrar si tiene al menos un campo rechazado
          if (identityStatus !== 'rejected' && metaStatus !== 'rejected') return null;

          return (
            <div key={area.key} className="bg-[#1a1b1f] border-2 border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-3xl">{area.emoji}</div>
                <h3 className="text-white font-bold text-lg">{area.name}</h3>
              </div>

              {/* Declaración de Identidad */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-bold text-gray-300">
                    Declaración de Identidad
                  </label>
                  {identityStatus === 'approved' && (
                    <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Check size={12} /> Aprobado
                    </div>
                  )}
                  {identityStatus === 'rejected' && (
                    <div className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <AlertCircle size={12} /> Requiere cambios
                    </div>
                  )}
                </div>

                {identityFeedback && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-2">
                    <p className="text-xs text-red-300">
                      <strong>💬 Mentor:</strong> {identityFeedback}
                    </p>
                  </div>
                )}

                <textarea
                  value={editedData[identityKey] || ''}
                  onChange={(e) => handleFieldChange(identityKey, e.target.value)}
                  disabled={identityStatus === 'approved'}
                  className={`w-full p-4 rounded-lg resize-none focus:ring-2 transition-all ${
                    identityStatus === 'rejected'
                      ? 'bg-red-900/20 border-2 border-red-500 text-white focus:ring-red-500'
                      : 'bg-green-900/20 border-2 border-green-500/50 text-gray-400 cursor-not-allowed'
                  }`}
                  rows={3}
                />
              </div>

              {/* Meta SMART */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-bold text-gray-300">
                    Meta SMART
                  </label>
                  {metaStatus === 'approved' && (
                    <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Check size={12} /> Aprobado
                    </div>
                  )}
                  {metaStatus === 'rejected' && (
                    <div className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <AlertCircle size={12} /> Requiere cambios
                    </div>
                  )}
                </div>

                {metaFeedback && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-2">
                    <p className="text-xs text-red-300">
                      <strong>💬 Mentor:</strong> {metaFeedback}
                    </p>
                  </div>
                )}

                <textarea
                  value={editedData[metaKey] || ''}
                  onChange={(e) => handleFieldChange(metaKey, e.target.value)}
                  disabled={metaStatus === 'approved'}
                  className={`w-full p-4 rounded-lg resize-none focus:ring-2 transition-all ${
                    metaStatus === 'rejected'
                      ? 'bg-red-900/20 border-2 border-red-500 text-white focus:ring-red-500'
                      : 'bg-green-900/20 border-2 border-green-500/50 text-gray-400 cursor-not-allowed'
                  }`}
                  rows={3}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1b1f] border-t border-gray-800 p-4 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={saveChanges}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {saving ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check size={20} />
                Guardar Cambios
              </>
            )}
          </button>

          <button
            onClick={resubmit}
            disabled={submitting}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:scale-105 disabled:opacity-50 transition-all"
          >
            {submitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <RefreshCw size={20} />
                Reenviar para Revisión
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
