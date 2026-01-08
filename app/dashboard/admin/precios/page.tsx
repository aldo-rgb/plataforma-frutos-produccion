'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Save, RefreshCw, Shield, Zap, Sparkles, Globe, MapPin, CheckCircle, XCircle, X } from 'lucide-react';

export default function AdminPreciosPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [moneda, setMoneda] = useState<'MXN' | 'USD'>('MXN');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ type: 'success', title: '', message: '', count: 0 });

  // ESTADO DE PRECIOS (Ahora se cargan desde la BD)
  const [precios, setPrecios] = useState({
    free: {
      mxn: { nombre: 'Free', precio: 0 },
      usd: { nombre: 'Free', precio: 0 }
    },
    standard: {
      mxn: { bimestral: 2000, anual: 10000 },
      usd: { bimestral: 150, anual: 800 }
    },
    premium: {
      mxn: { bimestral: 4000, anual: 25000 },
      usd: { bimestral: 300, anual: 1800 }
    },
    institucional: {
      mxn: { licencia: 2400 },
      usd: { licencia: 150 }
    },
    disciplina: {
      mxn: { llamada: 150 },
      usd: { llamada: 10 }
    }
  });

  // Cargar precios desde el backend
  useEffect(() => {
    const cargarPrecios = async () => {
      try {
        const response = await fetch('/api/admin/precios');
        if (response.ok) {
          const data = await response.json();
          setPrecios(data);
        }
      } catch (error) {
        console.error('Error cargando precios:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarPrecios();
  }, []);

  const handleChange = (plan: string, moneda: string, periodo: string, valor: string) => {
    setPrecios(prev => ({
      ...prev,
      [plan]: {
        ...prev[plan as keyof typeof prev],
        [moneda]: {
          ...(prev[plan as keyof typeof prev] as any)[moneda],
          [periodo]: Number(valor)
        }
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/precios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precios })
      });

      if (response.ok) {
        const data = await response.json();
        setModalData({
          type: 'success',
          title: 'Precios actualizados correctamente',
          message: data.message,
          count: data.count
        });
        setShowModal(true);
      } else {
        const error = await response.json();
        setModalData({
          type: 'error',
          title: 'Error al guardar precios',
          message: error.details || error.error,
          count: 0
        });
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      setModalData({
        type: 'error',
        title: 'Error de conexión',
        message: 'No se pudo conectar con el servidor',
        count: 0
      });
      setShowModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="text-emerald-500 animate-spin" size={48} />
            <p className="text-slate-400 text-lg">Cargando precios...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <DollarSign className="text-emerald-500" size={32} />
          Gestión de Precios y Planes
        </h1>
        <p className="text-slate-400">Define el valor de mercado para cada nivel de suscripción.</p>
      </div>

      {/* Selector de Moneda */}
      <div className="mb-6 flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <Globe className="text-slate-400" size={20} />
        <span className="text-slate-300 font-semibold">Vista de Precios:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setMoneda('MXN')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              moneda === 'MXN'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            🇲🇽 MXN (México)
          </button>
          <button
            onClick={() => setMoneda('USD')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              moneda === 'USD'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            🌎 USD (Internacional)
          </button>
        </div>
        <div className="ml-auto text-xs text-slate-500 flex items-center gap-2">
          <MapPin size={14} />
          El sistema detecta automáticamente la zona geográfica del usuario
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* 1. PLAN FREE */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
            <div className="bg-slate-800 p-2 rounded-lg text-slate-400">
              <Shield size={24}/>
            </div>
            <div>
              <h3 className="text-white font-bold">Licencia Free</h3>
              <p className="text-xs text-slate-500">Monitoreo por Quantum IA</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-center">
                <p className="text-4xl font-bold text-emerald-500">GRATIS</p>
                <p className="text-xs text-slate-500 mt-2">Sin costo alguno</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span>Carta sin autorización de mentor (auto-aprobada)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span>Objetivos y metas cargados automáticamente</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span>Evidencias con autorización automática</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">✗</span>
                <span>No genera puntos cuánticos</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">✗</span>
                <span>Sin mentor asignado</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. PLAN STANDARD */}
        <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
            <div className="bg-blue-900/20 p-2 rounded-lg text-blue-400">
              <Shield size={24}/>
            </div>
            <div>
              <h3 className="text-white font-bold">Plan Standard</h3>
              <p className="text-xs text-slate-500">Con Mentor + Disciplina</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                Bimestral ({moneda})
              </label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm">{moneda === 'MXN' ? '$' : 'US$'}</span>
                <input
                  type="number"
                  value={precios.standard[moneda.toLowerCase() as 'mxn' | 'usd'].bimestral}
                  onChange={(e) => handleChange('standard', moneda.toLowerCase(), 'bimestral', e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded p-3 text-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                Anual ({moneda})
              </label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm">{moneda === 'MXN' ? '$' : 'US$'}</span>
                <input
                  type="number"
                  value={precios.standard[moneda.toLowerCase() as 'mxn' | 'usd'].anual}
                  onChange={(e) => handleChange('standard', moneda.toLowerCase(), 'anual', e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded p-3 text-white font-bold"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <p className="text-xs text-slate-400 font-semibold mb-2">✨ Incluye:</p>
              <ul className="text-xs text-slate-500 space-y-1">
                <li>• 16 sesiones de disciplina</li>
                <li>• Seguimiento de objetivos y metas</li>
                <li>• Evidencias monitoreadas por mentor</li>
                <li>• Genera puntos cuánticos</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 3. PLAN PREMIUM (SALTO CUÁNTICO) */}
        <div className="bg-gradient-to-br from-yellow-900/20 to-purple-900/20 border-2 border-yellow-500/40 rounded-xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 text-[10px] font-bold px-3 py-1 rounded-bl-lg">
            PREMIUM
          </div>
          
          <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
            <div className="bg-yellow-500/20 p-2 rounded-lg text-yellow-400">
              <Zap size={24}/>
            </div>
            <div>
              <h3 className="text-white font-bold">Salto Cuántico</h3>
              <p className="text-xs text-yellow-500/80">Plan Completo Premium</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                Bimestral ({moneda})
              </label>
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 text-sm">{moneda === 'MXN' ? '$' : 'US$'}</span>
                <input
                  type="number"
                  value={precios.premium[moneda.toLowerCase() as 'mxn' | 'usd'].bimestral}
                  onChange={(e) => handleChange('premium', moneda.toLowerCase(), 'bimestral', e.target.value)}
                  className="flex-1 bg-slate-950 border border-yellow-500/30 rounded p-3 text-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                Anual ({moneda})
              </label>
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 text-sm">{moneda === 'MXN' ? '$' : 'US$'}</span>
                <input
                  type="number"
                  value={precios.premium[moneda.toLowerCase() as 'mxn' | 'usd'].anual}
                  onChange={(e) => handleChange('premium', moneda.toLowerCase(), 'anual', e.target.value)}
                  className="flex-1 bg-slate-950 border border-yellow-500/30 rounded p-3 text-white font-bold"
                />
              </div>
            </div>

            <div className="p-3 bg-yellow-500/5 rounded border border-yellow-500/20">
              <p className="text-xs text-yellow-500 font-semibold mb-2 flex items-center gap-1">
                <Sparkles size={14} /> Incluye TODO lo anterior más:
              </p>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• <strong className="text-yellow-500">3 sesiones 1:1</strong> con mentores</li>
                <li>• Acceso prioritario a la red</li>
                <li>• Coaching personalizado</li>
                <li>• Estrategias avanzadas</li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* Información adicional */}
      <div className="mt-8 grid md:grid-cols-2 gap-6">
        
        {/* LICENCIA INSTITUCIONAL */}
        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-2 border-indigo-500/40 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
            <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400">
              <Shield size={24}/>
            </div>
            <div>
              <h3 className="text-white font-bold">Licencia Institucional</h3>
              <p className="text-xs text-slate-500">Precio por licencia anual</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                Precio MXN (por licencia/año)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-indigo-400 text-sm">$</span>
                <input
                  type="number"
                  value={precios.institucional.mxn.licencia}
                  onChange={(e) => handleChange('institucional', 'mxn', 'licencia', e.target.value)}
                  className="flex-1 bg-slate-950 border border-indigo-500/30 rounded p-3 text-white font-bold"
                />
                <span className="text-slate-500 text-xs">MXN</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                Precio USD (por licencia/año)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-indigo-400 text-sm">US$</span>
                <input
                  type="number"
                  value={precios.institucional.usd.licencia}
                  onChange={(e) => handleChange('institucional', 'usd', 'licencia', e.target.value)}
                  className="flex-1 bg-slate-950 border border-indigo-500/30 rounded p-3 text-white font-bold"
                />
                <span className="text-slate-500 text-xs">USD</span>
              </div>
            </div>

            <div className="p-3 bg-indigo-500/5 rounded border border-indigo-500/20">
              <p className="text-xs text-indigo-400 font-semibold mb-2">📋 Incluye por licencia:</p>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Mentor asignado por estudiante</li>
                <li>• Retroalimentación personalizada</li>
                <li>• Monitor de progreso global</li>
              </ul>
            </div>

            <div className="text-center p-2 bg-slate-950 rounded border border-slate-800">
              <p className="text-xs text-slate-500">Cálculo de ejemplo (100 licencias):</p>
              <div className="flex justify-around mt-2">
                <div>
                  <p className="text-lg font-bold text-indigo-400">
                    ${(precios.institucional.mxn.licencia * 100).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-600">MXN</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-indigo-400">
                    US${(precios.institucional.usd.licencia * 100).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-600">USD</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LLAMADAS DE DISCIPLINA */}
        <div className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border-2 border-orange-500/40 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
            <div className="bg-orange-500/20 p-2 rounded-lg text-orange-400">
              <Zap size={24}/>
            </div>
            <div>
              <h3 className="text-white font-bold">Llamadas de Disciplina</h3>
              <p className="text-xs text-slate-500">Club de las 5 AM - Costo unitario</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                Precio MXN (por llamada)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-orange-400 text-sm">$</span>
                <input
                  type="number"
                  value={precios.disciplina.mxn.llamada}
                  onChange={(e) => handleChange('disciplina', 'mxn', 'llamada', e.target.value)}
                  className="flex-1 bg-slate-950 border border-orange-500/30 rounded p-3 text-white font-bold"
                />
                <span className="text-slate-500 text-xs">MXN</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                Precio USD (por llamada)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-orange-400 text-sm">US$</span>
                <input
                  type="number"
                  value={precios.disciplina.usd.llamada}
                  onChange={(e) => handleChange('disciplina', 'usd', 'llamada', e.target.value)}
                  className="flex-1 bg-slate-950 border border-orange-500/30 rounded p-3 text-white font-bold"
                />
                <span className="text-slate-500 text-xs">USD</span>
              </div>
            </div>

            <div className="p-3 bg-orange-500/5 rounded border border-orange-500/20">
              <p className="text-xs text-orange-400 font-semibold mb-2">⏰ Horario del programa:</p>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Llamadas de 5:00 AM a 8:00 AM</li>
                <li>• Duración: 15-20 minutos</li>
                <li>• Seguimiento de hábitos matutinos</li>
                <li>• Accountability diario</li>
              </ul>
            </div>

            <div className="text-center p-2 bg-slate-950 rounded border border-slate-800">
              <p className="text-xs text-slate-500">Precio mensual (16 sesiones):</p>
              <div className="flex justify-around mt-2">
                <div>
                  <p className="text-lg font-bold text-orange-400">
                    ${(precios.disciplina.mxn.llamada * 16).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-600">MXN</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-orange-400">
                    US${(precios.disciplina.usd.llamada * 16).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-600">USD</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Información adicional - Resumen General */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="bg-blue-900/10 border border-blue-500/30 rounded-xl p-4">
          <h4 className="text-white font-bold mb-2 flex items-center gap-2">
            🇲🇽 Resumen de Precios México (MXN)
          </h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Standard Bimestral: ${precios.standard.mxn.bimestral.toLocaleString()}</li>
            <li>• Standard Anual: ${precios.standard.mxn.anual.toLocaleString()}</li>
            <li>• Premium Bimestral: ${precios.premium.mxn.bimestral.toLocaleString()}</li>
            <li>• Premium Anual: ${precios.premium.mxn.anual.toLocaleString()}</li>
            <li className="pt-2 border-t border-slate-800">• Licencia Institucional: ${precios.institucional.mxn.licencia.toLocaleString()}/año</li>
            <li>• Llamada Disciplina: ${precios.disciplina.mxn.llamada.toLocaleString()}/sesión</li>
          </ul>
        </div>

        <div className="bg-purple-900/10 border border-purple-500/30 rounded-xl p-4">
          <h4 className="text-white font-bold mb-2 flex items-center gap-2">
            🌎 Resumen de Precios Internacionales (USD)
          </h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Standard Bimestral: US${precios.standard.usd.bimestral.toLocaleString()}</li>
            <li>• Standard Anual: US${precios.standard.usd.anual.toLocaleString()}</li>
            <li>• Premium Bimestral: US${precios.premium.usd.bimestral.toLocaleString()}</li>
            <li>• Premium Anual: US${precios.premium.usd.anual.toLocaleString()}</li>
            <li className="pt-2 border-t border-slate-800">• Licencia Institucional: US${precios.institucional.usd.licencia.toLocaleString()}/año</li>
            <li>• Llamada Disciplina: US${precios.disciplina.usd.llamada.toLocaleString()}/sesión</li>
          </ul>
        </div>
      </div>

      {/* Botón de guardar */}
      <div className="mt-8 flex justify-end">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <RefreshCw className="animate-spin" size={20}/> : <Save size={20}/>}
          {isSaving ? 'Guardando Cambios...' : 'Actualizar Tarifas'}
        </button>
      </div>

      {/* Modal de Confirmación */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-slate-700 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className={`p-6 border-b ${modalData.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    modalData.type === 'success' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {modalData.type === 'success' ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <XCircle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">
                      {modalData.title}
                    </h3>
                    {modalData.type === 'success' && modalData.count > 0 && (
                      <p className="text-sm text-emerald-400 mt-1">
                        {modalData.count} precios actualizados
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className={`text-base ${modalData.type === 'success' ? 'text-slate-300' : 'text-slate-400'}`}>
                {modalData.message}
              </p>

              {modalData.type === 'success' && (
                <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-emerald-300">
                      <p className="font-semibold mb-1">¡Cambios aplicados exitosamente!</p>
                      <p className="text-emerald-400/80">Los nuevos precios ya están disponibles para todos los usuarios.</p>
                    </div>
                  </div>
                </div>
              )}

              {modalData.type === 'error' && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-300">
                      <p className="font-semibold mb-1">Error al procesar la solicitud</p>
                      <p className="text-red-400/80">Por favor, verifica los datos e intenta nuevamente.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className={`px-6 py-3 rounded-lg font-bold transition-all shadow-lg ${
                  modalData.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                }`}
              >
                {modalData.type === 'success' ? '¡Entendido!' : 'Cerrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
