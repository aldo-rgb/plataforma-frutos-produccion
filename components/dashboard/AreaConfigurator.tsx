'use client';

import { useState, useEffect } from 'react';
import { Check, X, Settings, Save, AlertCircle } from 'lucide-react';

interface AreaConfiguratorProps {
  userId?: number; // Para admin/coordinador
  onClose?: () => void;
}

const ALL_AREAS = [
  { key: 'finanzas', name: 'FINANZAS', emoji: '💰', description: 'Manejo del dinero e inversiones' },
  { key: 'salud', name: 'SALUD', emoji: '💪', description: 'Bienestar físico y mental' },
  { key: 'relaciones', name: 'RELACIONES', emoji: '❤️', description: 'Vínculos personales y familiares' },
  { key: 'talentos', name: 'TALENTOS', emoji: '🎨', description: 'Desarrollo profesional y habilidades' },
  { key: 'pazMental', name: 'PAZ MENTAL', emoji: '🧘', description: 'Equilibrio emocional y espiritual' },
  { key: 'ocio', name: 'OCIO', emoji: '🎮', description: 'Descanso y actividades recreativas' },
  { key: 'servicioTrans', name: 'SERVICIO TRANSFORMACIONAL', emoji: '🌟', description: 'Impacto en la transformación de otros' },
  { key: 'servicioComun', name: 'SERVICIO COMUNITARIO', emoji: '🤝', description: 'Contribución a la comunidad' }
];

export default function AreaConfigurator({ userId, onClose }: AreaConfiguratorProps) {
  const [areas, setAreas] = useState<Array<{ areaKey: string; enabled: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [perteneceAGrupo, setPerteneceAGrupo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadConfig();
  }, [userId]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const url = userId ? `/api/areas-config?userId=${userId}` : '/api/areas-config';
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setAreas(data.areas || []);
      setPerteneceAGrupo(data.perteneceAGrupo || false);
    } catch (err: any) {
      setError('Error al cargar la configuración');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleArea = (areaKey: string) => {
    setAreas(prev => {
      const updated = prev.map(a =>
        a.areaKey === areaKey ? { ...a, enabled: !a.enabled } : a
      );
      
      // Validar mínimo de áreas según tipo de usuario
      const minAreas = perteneceAGrupo ? 1 : 4;
      const enabledCount = updated.filter(a => a.enabled).length;
      
      if (enabledCount < minAreas) {
        setError(`Debes mantener al menos ${minAreas} área${minAreas > 1 ? 's' : ''} habilitada${minAreas > 1 ? 's' : ''}`);
        return prev;
      }
      
      setError('');
      return updated;
    });
  };

  const handleSave = async () => {
    const minAreas = perteneceAGrupo ? 1 : 4;
    const enabledCount = areas.filter(a => a.enabled).length;
    
    if (enabledCount < minAreas) {
      setError(`Debes mantener al menos ${minAreas} área${minAreas > 1 ? 's' : ''} habilitada${minAreas > 1 ? 's' : ''}`);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/areas-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          areas
        })
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setSuccess('¡Configuración guardada correctamente!');
      setTimeout(() => {
        if (onClose) onClose();
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError('Error al guardar la configuración');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-2xl p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="text-gray-400 mt-4">Cargando configuración...</p>
      </div>
    );
  }

  const enabledCount = areas.filter(a => a.enabled).length;

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="text-white" size={28} />
            <div>
              <h2 className="text-2xl font-bold text-white">Configurar Áreas</h2>
              <p className="text-purple-100 text-sm">
                {perteneceAGrupo 
                  ? 'Personaliza las áreas para este usuario de grupo' 
                  : 'Selecciona las áreas que deseas completar'}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition"
            >
              <X size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Info Banner */}
        <div className="bg-blue-900/30 border border-blue-500/50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-400 flex-shrink-0" size={20} />
            <div className="text-sm text-blue-200">
              <p className="font-bold mb-1">Áreas seleccionadas: {enabledCount} de {areas.length}</p>
              <p>
                {perteneceAGrupo
                  ? 'Como administrador/coordinador, puedes personalizar las áreas que este usuario debe completar.'
                  : 'Selecciona las áreas que deseas trabajar. Debes mantener al menos una área activa.'}
              </p>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-4 flex items-center gap-2">
            <AlertCircle className="text-red-400" size={20} />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-4 mb-4 flex items-center gap-2">
            <Check className="text-green-400" size={20} />
            <p className="text-green-200 text-sm">{success}</p>
          </div>
        )}

        {/* Areas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {areas.map(area => {
            const areaInfo = ALL_AREAS.find(a => a.key === area.areaKey);
            if (!areaInfo) return null;

            return (
              <button
                key={area.areaKey}
                onClick={() => toggleArea(area.areaKey)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  area.enabled
                    ? 'border-purple-500 bg-purple-900/30 hover:bg-purple-900/50'
                    : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl flex-shrink-0">{areaInfo.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-bold ${area.enabled ? 'text-white' : 'text-gray-400'}`}>
                        {areaInfo.name}
                      </h3>
                      {area.enabled ? (
                        <Check className="text-green-400" size={20} />
                      ) : (
                        <X className="text-gray-500" size={20} />
                      )}
                    </div>
                    <p className={`text-xs ${area.enabled ? 'text-gray-300' : 'text-gray-500'}`}>
                      {areaInfo.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 justify-end">
          {onClose && (
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || enabledCount === 0}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-bold flex items-center gap-2 transition disabled:opacity-50 shadow-lg"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save size={20} />
                Guardar Configuración
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
