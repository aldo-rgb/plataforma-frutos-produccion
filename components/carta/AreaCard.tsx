'use client';

import React from 'react';
import { Sparkles, Trash2 } from 'lucide-react';
import { MetaCompleta } from '@/types/metas';

interface AreaCardProps {
  title: string;
  color: string;
  bgColor: string;
  metas: MetaCompleta[];
  setMetas: (metas: MetaCompleta[]) => void;
  isEditing: boolean;
  icon?: React.ReactNode;
}

export const AreaCard: React.FC<AreaCardProps> = ({ 
  title, 
  color, 
  bgColor,
  metas, 
  setMetas,
  isEditing,
  icon 
}) => {

  // --- HANDLERS (Lógica de actualización) ---
  
  // 1. Actualizar texto de Identidad o Meta Principal
  const updateMetaField = (indexMeta: number, field: 'declaracionPoder' | 'metaPrincipal', value: string) => {
    const nuevas = [...metas];
    nuevas[indexMeta][field] = value;
    setMetas(nuevas);
  };

  // 2. Agregar nueva acción a una meta específica
  const addAccion = (indexMeta: number) => {
    const nuevas = [...metas];
    nuevas[indexMeta].acciones.push({ 
      texto: '', 
      diasProgramados: [], 
      completada: false, 
      enRevision: false, 
      requiereEvidencia: false 
    });
    setMetas(nuevas);
  };

  // 3. Toggle de Días
  const toggleDia = (indexMeta: number, indexAccion: number, dia: string) => {
    const nuevas = [...metas];
    const diasActuales = nuevas[indexMeta].acciones[indexAccion].diasProgramados;
    
    if (diasActuales.includes(dia)) {
      nuevas[indexMeta].acciones[indexAccion].diasProgramados = diasActuales.filter(d => d !== dia);
    } else {
      nuevas[indexMeta].acciones[indexAccion].diasProgramados = [...diasActuales, dia];
    }
    setMetas(nuevas);
  };

  // 4. Actualizar texto de acción
  const updateAccionTexto = (indexMeta: number, indexAccion: number, value: string) => {
    const nuevas = [...metas];
    nuevas[indexMeta].acciones[indexAccion].texto = value;
    setMetas(nuevas);
  };

  // 5. Agregar NUEVA META COMPLETA
  const addNuevaMeta = () => {
    setMetas([
      ...metas, 
      { 
        orden: metas.length + 1,
        declaracionPoder: '', 
        metaPrincipal: '', 
        avance: 0,
        acciones: [{ texto: '', diasProgramados: [], completada: false, enRevision: false, requiereEvidencia: false }] 
      }
    ]);
  };

  // 6. Eliminar meta
  const removeMeta = (indexMeta: number) => {
    const nuevas = metas.filter((_, i) => i !== indexMeta);
    setMetas(nuevas);
  };

  // --- RENDERIZADO (UI) ---

  return (
    <div className="flex flex-col h-full bg-[#0f111a] rounded-xl overflow-hidden border border-slate-800">
      {/* HEADER DEL ÁREA */}
      <div className={`px-5 py-4 ${bgColor} border-b border-white/5 flex justify-between items-center`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <h3 className={`font-bold text-lg tracking-wider ${color}`}>{title.toUpperCase()}</h3>
        </div>
        <span className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded font-mono border border-slate-700">
          {metas.length} {metas.length === 1 ? 'OBJETIVO' : 'OBJETIVOS'}
        </span>
      </div>

      {/* CUERPO DEL ÁREA (Scrollable si hay muchas metas) */}
      <div className="p-5 space-y-8 overflow-y-auto custom-scrollbar">
        
        {metas.map((meta, index) => (
          <div 
            key={meta.id || `meta-${index}`}
            className="relative bg-[#151925] rounded-xl p-5 border border-slate-700/50 shadow-md transition-all hover:border-purple-500/30"
          >
            {/* Badge Decorativo de Número */}
            <div className="absolute -left-[1px] top-6 w-1 h-8 bg-purple-500 rounded-r shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
            
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-widest pl-3">
                Objetivo #{index + 1}
              </span>
              {/* Botón Eliminar Meta */}
              {isEditing && metas.length > 1 && (
                <button 
                  onClick={() => removeMeta(index)} 
                  className="text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 1. SECCIÓN: DECLARACIÓN DE PODER (El "Quién") */}
            <div className="mb-5 pl-3">
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 block">
                Declaración de Identidad
              </label>
              <div className="relative group">
                {isEditing ? (
                  <textarea
                    value={meta.declaracionPoder || ''}
                    onChange={(e) => updateMetaField(index, 'declaracionPoder', e.target.value)}
                    rows={2}
                    className="w-full bg-[#1a1e2e] text-purple-200 text-sm italic p-3 rounded-lg border border-purple-500/20 focus:border-purple-500 focus:bg-[#1f2437] focus:ring-0 outline-none resize-none transition-all placeholder-purple-400/30"
                    placeholder='"Yo soy compromiso absoluto..."'
                  />
                ) : (
                  <div className="w-full bg-[#1a1e2e] text-purple-200 text-sm italic p-3 rounded-lg border border-purple-500/20 min-h-[60px]">
                    {meta.declaracionPoder || <span className="text-purple-400/30">Sin definir</span>}
                  </div>
                )}
              </div>
            </div>

            {/* 2. SECCIÓN: META PRINCIPAL (El "Qué") */}
            <div className="mb-6 pl-3">
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 block">
                Meta Medible (S.M.A.R.T.)
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={meta.metaPrincipal || ''}
                  onChange={(e) => updateMetaField(index, 'metaPrincipal', e.target.value)}
                  className="w-full bg-[#0f111a] text-white text-base font-medium p-3 rounded-lg border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-600"
                  placeholder="Ej: Facturar 10k USD antes del día 30"
                />
              ) : (
                <div className="w-full bg-[#0f111a] text-white text-base font-medium p-3 rounded-lg border border-slate-700">
                  {meta.metaPrincipal || <span className="text-slate-600 font-normal">Sin definir</span>}
                </div>
              )}
            </div>

            {/* 3. SECCIÓN: ACCIONES Y DÍAS (El "Cómo") */}
            <div className="pl-3">
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-3 block">
                Plan de Acción Semanal
              </label>
              
              <div className="space-y-3">
                {meta.acciones.map((accion, accIndex) => (
                  <div key={accIndex} className="bg-[#0f111a] border border-slate-800 rounded-lg p-3 group/accion hover:border-slate-600 transition-colors">
                    
                    {/* Input de Texto */}
                    <div className="flex items-center gap-3 mb-3 border-b border-slate-800 pb-2">
                      <input 
                        type="checkbox" 
                        checked={accion.completada}
                        disabled={!isEditing}
                        className="w-4 h-4 rounded border-slate-600 bg-transparent accent-purple-500"
                        readOnly
                      />
                      {isEditing ? (
                        <input 
                          type="text"
                          value={accion.texto || ''}
                          onChange={(e) => updateAccionTexto(index, accIndex, e.target.value)}
                          className="w-full bg-transparent border-none text-slate-300 text-sm p-0 focus:ring-0 placeholder-slate-600"
                          placeholder="Describe la acción..."
                        />
                      ) : (
                        <span className="w-full text-slate-300 text-sm">
                          {accion.texto || <span className="text-slate-600">Sin definir</span>}
                        </span>
                      )}
                    </div>

                    {/* SELECTOR DE DÍAS (Siempre visible y expandido) */}
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-mono">DÍAS PROGRAMADOS:</span>
                      <div className="flex gap-1">
                        {[
                          { letra: 'L', dia: 'lunes' },
                          { letra: 'M', dia: 'martes' },
                          { letra: 'X', dia: 'miércoles' },
                          { letra: 'J', dia: 'jueves' },
                          { letra: 'V', dia: 'viernes' },
                          { letra: 'S', dia: 'sábado' },
                          { letra: 'D', dia: 'domingo' }
                        ].map(({ letra, dia }) => {
                          const isSelected = accion.diasProgramados.includes(dia);
                          return (
                            <button
                              key={`${letra}-${accIndex}-${dia}`}
                              onClick={() => isEditing && toggleDia(index, accIndex, dia)}
                              disabled={!isEditing}
                              className={`
                                w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold transition-all
                                ${isSelected 
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40' 
                                  : 'bg-[#1a1e2e] text-slate-500'}
                                ${isEditing ? 'hover:bg-slate-700 cursor-pointer' : 'cursor-default'}
                              `}
                            >
                              {letra}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón + Agregar Acción */}
              {isEditing && (
                <button
                  onClick={() => addAccion(index)}
                  className="mt-4 text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <span>+</span> Agregar otra acción a este objetivo
                </button>
              )}
            </div>

          </div>
        ))}

        {/* BOTÓN GRANDE: NUEVO OBJETIVO */}
        {isEditing && (
          <button
            onClick={addNuevaMeta}
            className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 hover:border-purple-500 hover:text-purple-400 hover:bg-purple-500/5 transition-all duration-300 flex flex-col items-center justify-center gap-1"
          >
            <span className="text-2xl font-light leading-none">+</span>
            <span className="text-xs font-bold tracking-widest uppercase">Definir Nuevo Objetivo en {title}</span>
          </button>
        )}

      </div>
    </div>
  );
};
