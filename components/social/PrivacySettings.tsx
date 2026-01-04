'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Users, Globe, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function PrivacySettings() {
  const [visibility, setVisibility] = useState<'PRIVATE' | 'COMMUNITY' | 'PUBLIC'>('COMMUNITY');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/social/privacy');
      const data = await response.json();
      
      if (data.success) {
        setVisibility(data.visibility);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newVisibility: typeof visibility) => {
    setSaving(true);
    try {
      const response = await fetch('/api/social/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newVisibility })
      });

      const data = await response.json();

      if (data.success) {
        setVisibility(newVisibility);
        toast.success(data.message);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error saving privacy:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-24 bg-slate-800 rounded-lg mb-3"></div>
        <div className="h-24 bg-slate-800 rounded-lg mb-3"></div>
        <div className="h-24 bg-slate-800 rounded-lg"></div>
      </div>
    );
  }

  const options = [
    {
      value: 'PRIVATE' as const,
      icon: EyeOff,
      title: '🔒 Privado',
      description: 'Solo yo y mi mentor podemos ver mis logros',
      color: 'border-slate-600'
    },
    {
      value: 'COMMUNITY' as const,
      icon: Users,
      title: '🌍 Comunidad',
      description: 'Visible en el Muro para usuarios registrados de mi Visión',
      color: 'border-blue-500'
    },
    {
      value: 'PUBLIC' as const,
      icon: Globe,
      title: '🚀 Público',
      description: 'Mis logros pueden compartirse externamente para inspirar',
      color: 'border-purple-500'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-blue-500" />
        <div>
          <h3 className="text-lg font-bold text-white">Privacidad y Difusión</h3>
          <p className="text-sm text-slate-400">Controla quién ve tus evidencias épicas</p>
        </div>
      </div>

      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = visibility === option.value;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              onClick={() => handleSave(option.value)}
              disabled={saving}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? `${option.color} bg-slate-800/50`
                  : 'border-slate-700 hover:border-slate-600 bg-slate-900'
              } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-6 h-6 mt-0.5 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {option.title}
                    </h4>
                    {isSelected && (
                      <span className="px-2 py-0.5 bg-blue-600 text-xs font-bold text-white rounded-full">
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{option.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
        <p className="text-sm text-blue-300">
          <strong>💡 Consejo:</strong> La configuración "Comunidad" te permite inspirar a otros miembros 
          mientras mantienes tu privacidad fuera de la app. Las evidencias marcadas como "Alta Calidad" 
          por la IA aparecerán automáticamente en el Muro de la Excelencia.
        </p>
      </div>
    </div>
  );
}
