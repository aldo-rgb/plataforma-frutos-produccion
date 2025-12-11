'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Target, Users, User, Calendar, Award, Sparkles, Trash2, Edit } from 'lucide-react';

interface MetaExtraordinaria {
  id: number;
  titulo: string;
  descripcion: string;
  puntosReward: number;
  tipoAsignacion: 'VISION' | 'INDIVIDUAL';
  visionObjetivo?: string;
  usuarioId?: number;
  fechaInicio: string;
  fechaFin: string;
  activa: boolean;
  creadoPor: number;
}

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  vision?: string;
}

export default function MetasExtraordinariasPage() {
  const [metas, setMetas] = useState<MetaExtraordinaria[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [visiones, setVisiones] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    puntosReward: 100,
    tipoAsignacion: 'VISION' as 'VISION' | 'INDIVIDUAL',
    visionObjetivo: '',
    usuarioId: '',
    fechaInicio: '',
    fechaFin: ''
  });

  useEffect(() => {
    fetchMetas();
    fetchUsuarios();
  }, []);

  const fetchMetas = async () => {
    try {
      const res = await fetch('/api/metas-extraordinarias');
      if (res.ok) {
        const data = await res.json();
        setMetas(data);
      }
    } catch (error) {
      console.error('Error al cargar metas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios');
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
        
        // Extraer visiones únicas
        const uniqueVisiones = [...new Set(data.map((u: Usuario) => u.vision).filter(Boolean))] as string[];
        setVisiones(uniqueVisiones);
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        puntosReward: parseInt(formData.puntosReward.toString()),
        usuarioId: formData.tipoAsignacion === 'INDIVIDUAL' ? parseInt(formData.usuarioId) : null,
        visionObjetivo: formData.tipoAsignacion === 'VISION' ? formData.visionObjetivo : null
      };

      const res = await fetch('/api/metas-extraordinarias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('✅ Meta extraordinaria creada con éxito');
        setShowModal(false);
        resetForm();
        fetchMetas();
      } else {
        alert('❌ Error al crear la meta');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al crear la meta');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta meta?')) return;

    try {
      const res = await fetch(`/api/metas-extraordinarias/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('✅ Meta eliminada');
        fetchMetas();
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      puntosReward: 100,
      tipoAsignacion: 'VISION',
      visionObjetivo: '',
      usuarioId: '',
      fechaInicio: '',
      fechaFin: ''
    });
  };

  if (loading) {
    return <div className="text-white text-center py-20">Cargando metas extraordinarias...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-end border-b border-white/10 pb-6">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter flex items-center gap-3">
            <Target className="text-purple-400" size={40} />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              Metas Extraordinarias
            </span>
          </h1>
          <p className="text-slate-400 mt-2 flex items-center gap-2">
            <Sparkles size={18} className='text-purple-400' />
            Asigna retos especiales a visiones o jugadores individuales
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
        >
          <Plus size={20} />
          Nueva Meta
        </button>
      </div>

      {/* LISTA DE METAS */}
      <div className="grid gap-6">
        {metas.length === 0 ? (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-12 text-center">
            <Target size={64} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg">No hay metas extraordinarias creadas</p>
            <p className="text-slate-500 text-sm mt-2">Crea la primera meta para motivar a tu equipo</p>
          </div>
        ) : (
          metas.map((meta) => (
            <div
              key={meta.id}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-purple-500/20 rounded-xl">
                      {meta.tipoAsignacion === 'VISION' ? (
                        <Users className="text-purple-400" size={24} />
                      ) : (
                        <User className="text-pink-400" size={24} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">{meta.titulo}</h3>
                      <p className="text-slate-400 mb-3">{meta.descripcion}</p>
                      
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className={`px-3 py-1 rounded-full font-medium ${
                          meta.tipoAsignacion === 'VISION' 
                            ? 'bg-purple-500/20 text-purple-300' 
                            : 'bg-pink-500/20 text-pink-300'
                        }`}>
                          {meta.tipoAsignacion === 'VISION' ? (
                            <>📋 Visión: {meta.visionObjetivo}</>
                          ) : (
                            <>👤 Individual</>
                          )}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 font-medium flex items-center gap-1">
                          <Award size={14} />
                          {meta.puntosReward} pts
                        </span>
                        <span className="px-3 py-1 rounded-full bg-slate-700 text-slate-300 flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(meta.fechaInicio).toLocaleDateString()} - {new Date(meta.fechaFin).toLocaleDateString()}
                        </span>
                        {meta.activa && (
                          <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 font-medium">
                            ✓ Activa
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(meta.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL PARA CREAR META */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Target className="text-purple-400" />
              Crear Meta Extraordinaria
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Título */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Título de la Meta
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  placeholder="Ej: Reto Navideño: 10,000 pasos diarios"
                  required
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 resize-none"
                  rows={3}
                  placeholder="Describe los detalles del reto..."
                  required
                />
              </div>

              {/* Puntos Reward */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Puntos Cuánticos de Recompensa
                </label>
                <input
                  type="number"
                  value={formData.puntosReward}
                  onChange={(e) => setFormData({ ...formData, puntosReward: parseInt(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  min="10"
                  step="10"
                  required
                />
              </div>

              {/* Tipo de Asignación */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Tipo de Asignación
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipoAsignacion: 'VISION', usuarioId: '' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.tipoAsignacion === 'VISION'
                        ? 'border-purple-500 bg-purple-500/20 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Users className="mx-auto mb-2" size={24} />
                    <span className="font-bold">Toda una Visión</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipoAsignacion: 'INDIVIDUAL', visionObjetivo: '' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.tipoAsignacion === 'INDIVIDUAL'
                        ? 'border-pink-500 bg-pink-500/20 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-400'
                    }`}
                  >
                    <User className="mx-auto mb-2" size={24} />
                    <span className="font-bold">Jugador Individual</span>
                  </button>
                </div>
              </div>

              {/* Selector de Visión o Usuario */}
              {formData.tipoAsignacion === 'VISION' ? (
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">
                    Seleccionar Visión
                  </label>
                  <select
                    value={formData.visionObjetivo}
                    onChange={(e) => setFormData({ ...formData, visionObjetivo: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    required
                  >
                    <option value="">-- Selecciona una visión --</option>
                    {visiones.map((vision) => (
                      <option key={vision} value={vision}>
                        {vision}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">
                    Seleccionar Jugador
                  </label>
                  <select
                    value={formData.usuarioId}
                    onChange={(e) => setFormData({ ...formData, usuarioId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    required
                  >
                    <option value="">-- Selecciona un jugador --</option>
                    {usuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nombre} ({usuario.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={formData.fechaInicio}
                    onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">
                    Fecha de Fin
                  </label>
                  <input
                    type="date"
                    value={formData.fechaFin}
                    onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 border border-slate-600 rounded-xl font-bold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-white hover:scale-105 transition-transform shadow-lg"
                >
                  Crear Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
