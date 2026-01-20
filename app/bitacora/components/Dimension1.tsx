// Dimensión 1: Raíces y Relaciones
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Heart, Plus, Trash2, UserPlus } from 'lucide-react';

interface Child {
  name: string;
  age: number;
  relationship: string;
}

interface Dimension1Props {
  data: any;
  onChange: (data: any) => void;
}

const MARITAL_STATUS_OPTIONS = [
  { value: 'SINGLE', label: 'Soltero/a' },
  { value: 'MARRIED', label: 'Casado/a' },
  { value: 'DIVORCED', label: 'Divorciado/a' },
  { value: 'WIDOWED', label: 'Viudo/a' },
  { value: 'COMMON_LAW', label: 'Unión Libre' },
  { value: 'DATING', label: 'En una relación' },
];

export default function Dimension1({ data, onChange }: Dimension1Props) {
  const [children, setChildren] = useState<Child[]>(data.childrenData || []);
  const showPartnerQuestions = ['MARRIED', 'COMMON_LAW', 'DATING'].includes(data.maritalStatus);
  
  // Block paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    // toast.error('Por favor escribe tu respuesta manualmente');
  };

  const addChild = () => {
    const newChildren = [...children, { name: '', age: 0, relationship: '' }];
    setChildren(newChildren);
    onChange({ childrenData: newChildren, hasChildren: true });
  };

  const removeChild = (index: number) => {
    const newChildren = children.filter((_, i) => i !== index);
    setChildren(newChildren);
    onChange({ 
      childrenData: newChildren, 
      hasChildren: newChildren.length > 0 
    });
  };

  const updateChild = (index: number, field: keyof Child, value: string | number) => {
    const newChildren = [...children];
    newChildren[index] = { ...newChildren[index], [field]: value };
    setChildren(newChildren);
    onChange({ childrenData: newChildren });
  };

  return (
    <motion.div
      className="max-w-2xl mx-auto pb-32"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Raíces y Relaciones</h2>
        <p className="text-gray-400">Tu historia familiar y las personas que te rodean</p>
      </div>

      <div className="space-y-8">
        {/* Estado Civil */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Estado Civil
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MARITAL_STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ maritalStatus: option.value })}
                className={`
                  px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${data.maritalStatus === option.value
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 border border-gray-700'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preguntas de pareja (condicional) */}
        {showPartnerQuestions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl"
          >
            <div className="flex items-center gap-2 text-blue-400 mb-4">
              <Heart className="w-5 h-5" />
              <span className="font-medium">Sobre tu pareja</span>
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">
                Describe la relación que tienes con tu pareja y cuáles son tus interpretaciones hacia esta relación.
              </label>
              <textarea
                value={data.partnerRelationship || ''}
                onChange={(e) => onChange({ partnerRelationship: e.target.value })}
                onPaste={handlePaste}
                placeholder="Sé honesto/a contigo mismo/a..."
                className="w-full h-40 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">
                Califica esta relación del 1 al 10
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={data.partnerRelationshipScore || 5}
                  onChange={(e) => onChange({ partnerRelationshipScore: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="w-12 h-12 flex items-center justify-center bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl text-xl font-bold">
                  {data.partnerRelationshipScore || 5}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Hijos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-300">
              ¿Tienes hijos?
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (data.hasChildren) {
                    onChange({ hasChildren: false, childrenData: [] });
                    setChildren([]);
                  } else {
                    onChange({ hasChildren: true });
                    if (children.length === 0) addChild();
                  }
                }}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${data.hasChildren
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }
                `}
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange({ hasChildren: false, childrenData: [] });
                  setChildren([]);
                }}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${!data.hasChildren && data.hasChildren !== undefined
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }
                `}
              >
                No
              </button>
            </div>
          </div>

          {/* Children cards */}
          {data.hasChildren && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {children.map((child, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-800/30 border border-gray-700 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-400">Hijo/a {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeChild(index)}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={child.name}
                      onChange={(e) => updateChild(index, 'name', e.target.value)}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:border-blue-500 outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Edad"
                      value={child.age || ''}
                      onChange={(e) => updateChild(index, 'age', parseInt(e.target.value) || 0)}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  
                  <textarea
                    placeholder="¿Cómo es tu relación con él/ella?"
                    value={child.relationship}
                    onChange={(e) => updateChild(index, 'relationship', e.target.value)}
                    onPaste={handlePaste}
                    className="w-full h-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={addChild}
                className="w-full py-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:text-gray-300 hover:border-gray-600 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar otro hijo/a
              </button>
            </motion.div>
          )}
        </div>

        {/* Relación con padres */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            ¿Cómo es tu relación con tus papás? <span className="text-gray-500">(Sé específico/a)</span>
          </label>
          <textarea
            value={data.parentsRelationship || ''}
            onChange={(e) => onChange({ parentsRelationship: e.target.value })}
            onPaste={handlePaste}
            placeholder="Describe tu relación con tu madre y tu padre por separado..."
            className="w-full h-40 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
          />
        </div>

        {/* Hermanos */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            ¿Cuántos hermanos tienes?
          </label>
          <input
            type="number"
            min="0"
            value={data.siblingsCount || ''}
            onChange={(e) => onChange({ siblingsCount: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none"
            placeholder="0"
          />
        </div>

        {data.siblingsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            <label className="block text-sm font-medium text-gray-300">
              ¿Cómo es tu relación con cada uno de ellos?
            </label>
            <textarea
              value={data.siblingsRelationship || ''}
              onChange={(e) => onChange({ siblingsRelationship: e.target.value })}
              onPaste={handlePaste}
              placeholder="Describe tu relación con cada hermano/a..."
              className="w-full h-32 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none resize-none"
            />
          </motion.div>
        )}

        {/* Red de apoyo */}
        <div className="p-6 bg-purple-500/5 border border-purple-500/20 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-purple-400">
            <UserPlus className="w-5 h-5" />
            <span className="font-medium">Red de Apoyo</span>
          </div>
          
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              ¿Algún familiar o amigo va a tomar este entrenamiento contigo?
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChange({ hasCompanion: true })}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${data.hasCompanion
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }
                `}
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => onChange({ hasCompanion: false, companionName: '', companionRelation: '' })}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${data.hasCompanion === false
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }
                `}
              >
                No
              </button>
            </div>
          </div>

          {data.hasCompanion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 gap-3"
            >
              <input
                type="text"
                placeholder="Nombre"
                value={data.companionName || ''}
                onChange={(e) => onChange({ companionName: e.target.value })}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 outline-none"
              />
              <input
                type="text"
                placeholder="Relación contigo"
                value={data.companionRelation || ''}
                onChange={(e) => onChange({ companionRelation: e.target.value })}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 outline-none"
              />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
