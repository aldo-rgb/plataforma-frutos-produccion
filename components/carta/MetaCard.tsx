'use client';

import React, { useState } from 'react';
import { Sparkles, Trash2, Plus, Calendar } from 'lucide-react';
import { MetaCompleta, Accion } from '@/types/metas';

interface MetaCardProps {
  meta: MetaCompleta;
  indexMeta: number;
  categoria: string;
  isEditing: boolean;
  onUpdate: (updatedMeta: MetaCompleta) => void;
  onDelete: () => void;
  parseGoalForTasks: (text: string) => any;
  onOpenDaySelector: (metaIndex: number, accionIndex: number, currentDays: string[]) => void;
}

export default function MetaCard({
  meta,
  indexMeta,
  categoria,
  isEditing,
  onUpdate,
  onDelete,
  parseGoalForTasks,
  onOpenDaySelector
}: MetaCardProps) {
  
  const updateMetaField = (field: keyof MetaCompleta, value: any) => {
    onUpdate({ ...meta, [field]: value });
  };

  const updateAccionText = (accionIndex: number, texto: string) => {
    const nuevasAcciones = [...meta.acciones];
    nuevasAcciones[accionIndex] = { ...nuevasAcciones[accionIndex], texto };
    onUpdate({ ...meta, acciones: nuevasAcciones });
  };

  const toggleDiaAccion = (accionIndex: number, dia: string) => {
    const nuevasAcciones = [...meta.acciones];
    const accion = nuevasAcciones[accionIndex];
    const dias = accion.diasProgramados || [];
    
    if (dias.includes(dia)) {
      accion.diasProgramados = dias.filter(d => d !== dia);
    } else {
      accion.diasProgramados = [...dias, dia];
    }
    
    onUpdate({ ...meta, acciones: nuevasAcciones });
  };

  const addAccion = () => {
    const nuevaAccion: Accion = {
      texto: '',
      diasProgramados: [],
      completada: false,
      enRevision: false,
      requiereEvidencia: false
    };
    onUpdate({ ...meta, acciones: [...meta.acciones, nuevaAccion] });
  };

  const removeAccion = (accionIndex: number) => {
    const nuevasAcciones = meta.acciones.filter((_, i) => i !== accionIndex);
    onUpdate({ ...meta, acciones: nuevasAcciones });
  };

  const isEnrolamiento = categoria === 'ENROLAMIENTO';

  return (
    <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700 relative">
      
      {/* Botón para eliminar meta (si hay más de una) */}
      {isEditing && indexMeta > 0 && !isEnrolamiento && (
        <button 
          onClick={onDelete}
          className="absolute top-2 right-2 text-red-400 hover:text-red-300 text-xs flex items-center gap-1 bg-red-900/20 px-2 py-1 rounded transition-colors"
        >
          <Trash2 size={12} />
          Borrar Meta
        </button>
      )}

      {/* 1. DECLARACIÓN DE PODER (Identidad) */}
      {!isEnrolamiento && (
        <>
          {isEditing ? (
            <div className="mb-4">
              <label className="text-xs text-purple-300 font-bold uppercase tracking-wide flex items-center gap-1 mb-2">
                <Sparkles size={12} />
                ¿Quién debo ser?
              </label>
              <input 
                type="text"
                value={meta.declaracionPoder || ''}
                onChange={(e) => updateMetaField('declaracionPoder', e.target.value)}
                className="w-full bg-purple-900/10 border-l-2 border-purple-500 text-sm italic text-purple-100 p-3 rounded focus:outline-none focus:border-purple-400 placeholder-purple-400/50"
                placeholder='Ej: "Yo soy compromiso inquebrantable..."'
              />
            </div>
          ) : (
            meta.declaracionPoder && (
              <div className="mb-4 p-3 bg-purple-900/20 rounded-lg border-l-4 border-purple-500">
                <p className="text-xs text-purple-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  <Sparkles size={12} />
                  MI DECLARACIÓN
                </p>
                <p className="text-sm text-purple-100 italic leading-relaxed">
                  "{meta.declaracionPoder}"
                </p>
              </div>
            )
          )}
        </>
      )}

      {/* 2. META PRINCIPAL */}
      <div className="mb-4">
        <label className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-2 block">
          {isEnrolamiento ? 'Compromiso' : 'Meta Principal'}
        </label>
        {isEditing ? (
          <textarea 
            value={meta.metaPrincipal || ''}
            onChange={(e) => updateMetaField('metaPrincipal', e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg p-3 text-white font-medium text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none h-20 placeholder-slate-500"
            placeholder={isEnrolamiento ? "Ej: Invitar a 4 personas" : "Ej: Juntar 10k pesos"}
          />
        ) : (
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
            <p className="text-white font-medium text-sm leading-relaxed">
              {meta.metaPrincipal || <span className="text-slate-500 italic">Sin meta definida</span>}
            </p>
          </div>
        )}
      </div>

      {/* 3. ACCIONES COMPROMETIDAS */}
      {!isEnrolamiento && (
        <div>
          <label className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-2 block">
            Acciones Comprometidas
          </label>
          <div className="space-y-3">
            {meta.acciones.map((accion, accionIndex) => {
              const parsed = parseGoalForTasks(accion.texto || '');
              const hasDays = accion.diasProgramados && accion.diasProgramados.length > 0;
              
              return (
                <div key={accionIndex} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                  {/* Texto de la acción */}
                  <div className="flex items-center gap-2 mb-2">
                    {isEditing ? (
                      <>
                        <input 
                          type="text"
                          value={accion.texto || ''}
                          onChange={(e) => updateAccionText(accionIndex, e.target.value)}
                          className="flex-1 bg-transparent text-sm text-white border-b border-slate-700 pb-1 focus:border-cyan-500 outline-none placeholder-slate-500"
                          placeholder="Ej: Ahorrar 1000 pesos..."
                        />
                        {meta.acciones.length > 1 && (
                          <button
                            onClick={() => removeAccion(accionIndex)}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-slate-300">
                        {accion.texto || <span className="text-slate-600 italic">Sin acción definida</span>}
                      </span>
                    )}
                  </div>
                  
                  {/* SELECTOR DE DÍAS */}
                  {isEditing && parsed.isQuantifiableAndRecurrent && (
                    <div className="flex gap-1 flex-wrap">
                      {['L','M','M','J','V','S','D'].map((dia, idx) => {
                        const diasCompletos = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
                        const diaCompleto = diasCompletos[idx];
                        const isSelected = accion.diasProgramados?.includes(diaCompleto);
                        
                        return (
                          <button
                            key={dia + idx}
                            onClick={() => toggleDiaAccion(accionIndex, diaCompleto)}
                            className={`w-7 h-7 text-[10px] rounded-full font-bold transition-all ${
                              isSelected 
                                ? 'bg-cyan-500 text-white ring-2 ring-cyan-300' 
                                : 'bg-slate-700 text-gray-500 hover:bg-slate-600'
                            }`}
                          >
                            {dia}
                          </button>
                        );
                      })}
                      {!hasDays && (
                        <span className="text-xs text-yellow-400 ml-2 flex items-center gap-1">
                          <Calendar size={12} />
                          Selecciona días
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Mostrar días programados en modo lectura */}
                  {!isEditing && hasDays && (
                    <div className="flex gap-1 mt-2">
                      {['L','M','M','J','V','S','D'].map((dia, idx) => {
                        const diasCompletos = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
                        const diaCompleto = diasCompletos[idx];
                        const isSelected = accion.diasProgramados?.includes(diaCompleto);
                        
                        return (
                          <div
                            key={dia + idx}
                            className={`w-6 h-6 text-[9px] rounded-full font-bold flex items-center justify-center ${
                              isSelected 
                                ? 'bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-500' 
                                : 'bg-slate-800 text-slate-600'
                            }`}
                          >
                            {dia}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Botón para agregar más acciones */}
            {isEditing && (
              <button 
                onClick={addAccion}
                className="w-full py-2 px-3 text-xs text-cyan-400 border border-dashed border-slate-600 rounded hover:border-cyan-500 hover:bg-cyan-500/5 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                Agregar otra acción
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
