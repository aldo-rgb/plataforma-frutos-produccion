'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface Vision {
  id: number;
  nombre: string;
}

interface CommissionConfig {
  id: number;
  visionId: number;
  organizationId: number;
  basicSeatedRate: string;
  advanceSeatedRate: string;
  plStartRate: string;
  plGuestRate: string;
  plGradRate: string;
  createdAt: string;
  updatedAt: string;
  vision: Vision;
}

export default function AdminCommissionConfig() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedVisionId, setSelectedVisionId] = useState<string>('');
  const [config, setConfig] = useState<CommissionConfig | null>(null);
  const [visions, setVisions] = useState<Vision[]>([]);
  
  const [formData, setFormData] = useState({
    basicSeatedRate: '300',
    advanceSeatedRate: '500',
    plStartRate: '400',
    plGuestRate: '400',
    plGradRate: '400',
  });

  useEffect(() => {
    fetchVisions();
  }, []);

  useEffect(() => {
    if (selectedVisionId) {
      fetchConfig();
    }
  }, [selectedVisionId]);

  async function fetchVisions() {
    try {
      // Ajustar endpoint según tu API de visiones
      const res = await fetch('/api/visiones');
      if (res.ok) {
        const data = await res.json();
        setVisions(data);
        if (data.length > 0) {
          setSelectedVisionId(data[0].id.toString());
        }
      }
    } catch (err) {
      console.error('Error al cargar visiones:', err);
      alert('❌ Error: No se pudieron cargar las visiones');
    }
  }

  async function fetchConfig() {
    try {
      setLoading(true);
      const res = await fetch(`/api/coordinator-commissions/config?visionId=${selectedVisionId}`);
      
      if (!res.ok) {
        throw new Error('Error al cargar configuración');
      }

      const data = await res.json();
      setConfig(data);
      setFormData({
        basicSeatedRate: data.basicSeatedRate,
        advanceSeatedRate: data.advanceSeatedRate,
        plStartRate: data.plStartRate,
        plGuestRate: data.plGuestRate,
        plGradRate: data.plGradRate,
      });
    } catch (err) {
      console.error('Error:', err);
      alert('❌ Error: No se pudo cargar la configuración');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedVisionId) {
      alert('⚠️ Advertencia: Selecciona una visión');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/coordinator-commissions/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visionId: Number(selectedVisionId),
          ...formData,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al guardar configuración');
      }

      const data = await res.json();
      setConfig(data);
      
      alert('✅ Guardado: Configuración actualizada correctamente');
    } catch (err) {
      console.error('Error:', err);
      alert('❌ Error: No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  }

  const calculateTotal = () => {
    const total =
      Number(formData.basicSeatedRate) +
      Number(formData.advanceSeatedRate) +
      Number(formData.plStartRate) +
      Number(formData.plGuestRate) +
      Number(formData.plGradRate);
    return total;
  };

  const formatCurrency = (value: string) => {
    const num = Number(value);
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(num);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">⚙️ Configuración de Comisiones</h1>
          <p className="text-gray-400 mt-1">Administra las tarifas de comisiones por visión</p>
        </div>
      </div>

      {/* Selector de Visión */}
      <div className="bg-[#1a1b2e] border border-purple-500/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-2">Selecciona una Visión</h2>
        <p className="text-gray-400 text-sm mb-4">Las tarifas se configuran por cada visión</p>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedVisionId}
            onChange={(e) => setSelectedVisionId(e.target.value)}
            className="flex-1 bg-[#0a0b14] border border-gray-700 text-gray-100 rounded-lg px-4 py-2"
          >
            <option value="">Selecciona una visión</option>
            {visions.map((vision) => (
              <option key={vision.id} value={vision.id.toString()}>
                {vision.nombre}
              </option>
            ))}
          </select>
          <button
            onClick={fetchConfig}
            disabled={loading || !selectedVisionId}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {loading ? '⏳ Cargando...' : '🔄 Cargar'}
          </button>
        </div>
      </div>

      {/* Formulario de Configuración */}
      {selectedVisionId && (
        <>
          <div className="bg-[#1a1b2e] border border-purple-500/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-2">💰 Tarifas de Comisiones</h2>
            <p className="text-gray-400 text-sm mb-6">Define el monto de cada tipo de comisión</p>

            <div className="space-y-6">
              {/* Básico Sentado */}
              <div className="space-y-2">
                <label className="text-gray-300 flex items-center font-medium">
                  💙 Básico Sentado (con asistencia)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    value={formData.basicSeatedRate}
                    onChange={(e) =>
                      setFormData({ ...formData, basicSeatedRate: e.target.value })
                    }
                    className="flex-1 bg-[#0a0b14] border border-gray-700 text-gray-100 rounded-lg px-4 py-2"
                    placeholder="300"
                  />
                  <span className="text-2xl font-bold text-blue-500 min-w-[150px]">
                    {formatCurrency(formData.basicSeatedRate)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Por cada alumno sentado en Básico con asistencia</p>
              </div>

              {/* Avanzado Sentado */}
              <div className="space-y-2">
                <label className="text-gray-300 flex items-center font-medium">
                  💜 Avanzado Sentado (conversión)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    value={formData.advanceSeatedRate}
                    onChange={(e) =>
                      setFormData({ ...formData, advanceSeatedRate: e.target.value })
                    }
                    className="flex-1 bg-[#0a0b14] border border-gray-700 text-gray-100 rounded-lg px-4 py-2"
                    placeholder="500"
                  />
                  <span className="text-2xl font-bold text-purple-500 min-w-[150px]">
                    {formatCurrency(formData.advanceSeatedRate)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Por cada alumno que cruza de Básico a Avanzado</p>
              </div>

              {/* PL Inicio */}
              <div className="space-y-2">
                <label className="text-gray-300 flex items-center font-medium">
                  💚 PL Inicio (tu tribu)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    value={formData.plStartRate}
                    onChange={(e) =>
                      setFormData({ ...formData, plStartRate: e.target.value })
                    }
                    className="flex-1 bg-[#0a0b14] border border-gray-700 text-gray-100 rounded-lg px-4 py-2"
                    placeholder="400"
                  />
                  <span className="text-2xl font-bold text-green-500 min-w-[150px]">
                    {formatCurrency(formData.plStartRate)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Por alumno de tu tribu que inicia PL</p>
              </div>

              {/* PL Invitado */}
              <div className="space-y-2">
                <label className="text-gray-300 flex items-center font-medium">
                  🧡 PL Invitado (traído por tu tribu)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    value={formData.plGuestRate}
                    onChange={(e) =>
                      setFormData({ ...formData, plGuestRate: e.target.value })
                    }
                    className="flex-1 bg-[#0a0b14] border border-gray-700 text-gray-100 rounded-lg px-4 py-2"
                    placeholder="400"
                  />
                  <span className="text-2xl font-bold text-orange-500 min-w-[150px]">
                    {formatCurrency(formData.plGuestRate)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Por invitado pagado traído por alumnos de tu tribu</p>
              </div>

              {/* PL Graduación */}
              <div className="space-y-2">
                <label className="text-gray-300 flex items-center font-medium">
                  🩷 PL Graduación (tu tribu)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    value={formData.plGradRate}
                    onChange={(e) =>
                      setFormData({ ...formData, plGradRate: e.target.value })
                    }
                    className="flex-1 bg-[#0a0b14] border border-gray-700 text-gray-100 rounded-lg px-4 py-2"
                    placeholder="400"
                  />
                  <span className="text-2xl font-bold text-pink-500 min-w-[150px]">
                    {formatCurrency(formData.plGradRate)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Por alumno de tu tribu que se gradúa de PL</p>
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-[#1a1b2e] border border-green-500/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-2">📊 Resumen de Configuración</h2>
            <p className="text-gray-400 text-sm mb-6">Vista previa del impacto de las tarifas</p>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/40">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Suma de todas las tarifas:</span>
                  <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                    {formatCurrency(calculateTotal().toString())}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-[#0a0b14] border border-gray-700">
                  <div className="text-sm text-gray-400">Última actualización</div>
                  <div className="text-lg font-medium text-gray-100 mt-1">
                    {config?.updatedAt
                      ? new Date(config.updatedAt).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Nueva configuración'}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#0a0b14] border border-gray-700">
                  <div className="text-sm text-gray-400">Visión configurada</div>
                  <div className="text-lg font-medium text-gray-100 mt-1">
                    {config?.vision?.nombre || 'Selecciona una visión'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end space-x-4">
            <button
              onClick={fetchConfig}
              disabled={loading}
              className="border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {loading ? '⏳ Recargando...' : '🔄 Recargar'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !selectedVisionId}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {saving ? '💾 Guardando...' : '💾 Guardar Configuración'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
