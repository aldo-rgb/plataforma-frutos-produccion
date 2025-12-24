'use client';

import { useState, useEffect } from 'react';
import { School, DollarSign, Calendar, Percent, Save, AlertCircle } from 'lucide-react';

interface SchoolLicenseConfig {
  organizationId: number;
  organizationName: string;
  standardPrice: number;
  premiumPrice: number;
  cycleDurationMonths: number;
  renewalOfferEnabled: boolean;
  renewalDiscount: number;
}

export default function SchoolLicenseConfigPanel() {
  const [config, setConfig] = useState<SchoolLicenseConfig>({
    organizationId: 0,
    organizationName: '',
    standardPrice: 600,
    premiumPrice: 1250,
    cycleDurationMonths: 6,
    renewalOfferEnabled: true,
    renewalDiscount: 50
  });

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/admin/organizations');
      const data = await res.json();
      if (data.success) {
        setOrganizations(data.organizations);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const loadOrganizationConfig = async (orgId: number) => {
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/config`);
      const data = await res.json();
      if (data.success) {
        setConfig({
          organizationId: data.organization.id,
          organizationName: data.organization.name,
          standardPrice: data.organization.standardLicensePrice,
          premiumPrice: data.organization.premiumLicensePrice,
          cycleDurationMonths: data.organization.visionCycleDuration,
          renewalOfferEnabled: data.organization.renewalOfferEnabled,
          renewalDiscount: data.organization.renewalOfferDiscount
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const handleSave = async () => {
    if (!config.organizationId) {
      setMessage({ type: 'error', text: 'Por favor selecciona una organización' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/organizations/${config.organizationId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standardLicensePrice: config.standardPrice,
          premiumLicensePrice: config.premiumPrice,
          visionCycleDuration: config.cycleDurationMonths,
          renewalOfferEnabled: config.renewalOfferEnabled,
          renewalOfferDiscount: config.renewalDiscount
        })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: '✅ Configuración guardada exitosamente' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const calculateRevenue = () => {
    const org = organizations.find(o => o.id === config.organizationId);
    if (!org) return { standard: 0, premium: 0, total: 0 };

    const standardRevenue = org.totalStudents * config.standardPrice;
    const premiumRevenue = org.totalStudents * config.premiumPrice;
    const mixedRevenue = (org.totalStudents * 0.7 * config.standardPrice) + 
                         (org.totalStudents * 0.3 * config.premiumPrice);

    return {
      standard: standardRevenue,
      premium: premiumRevenue,
      mixed: mixedRevenue
    };
  };

  const revenue = calculateRevenue();

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <School className="w-8 h-8 text-purple-400" />
          <h2 className="text-3xl font-bold text-white">
            Configuración de Licencias Escolares
          </h2>
        </div>
        <p className="text-gray-400">
          Personaliza precios y duración de ciclos para cada escuela (B2B Flexible)
        </p>
      </div>

      {/* Selector de Organización */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Selecciona una Escuela
        </label>
        <select
          value={config.organizationId}
          onChange={(e) => {
            const orgId = parseInt(e.target.value);
            setConfig({ ...config, organizationId: orgId });
            if (orgId > 0) loadOrganizationConfig(orgId);
          }}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
        >
          <option value={0}>-- Selecciona una organización --</option>
          {organizations.map(org => (
            <option key={org.id} value={org.id}>
              {org.name} ({org.totalStudents} estudiantes)
            </option>
          ))}
        </select>
      </div>

      {config.organizationId > 0 && (
        <>
          {/* Pricing Configuration */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-green-400" />
              Precio por Licencia (MXN)
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Standard */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Licencia STANDARD
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400">$</span>
                  <input
                    type="number"
                    value={config.standardPrice}
                    onChange={(e) => setConfig({ ...config, standardPrice: parseFloat(e.target.value) })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-8 pr-4 py-3 text-white"
                    min="0"
                    step="50"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  Precio público: $800/año
                </p>
              </div>

              {/* Premium */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Licencia PREMIUM
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400">$</span>
                  <input
                    type="number"
                    value={config.premiumPrice}
                    onChange={(e) => setConfig({ ...config, premiumPrice: parseFloat(e.target.value) })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-8 pr-4 py-3 text-white"
                    min="0"
                    step="50"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  Precio público: $2,500/año
                </p>
              </div>
            </div>

            {/* Revenue Projections */}
            <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-400 mb-3">
                📊 <strong>Proyección de Ingresos:</strong>
              </p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">100% Standard</p>
                  <p className="text-green-400 font-bold">${revenue.standard?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">70/30 Mix</p>
                  <p className="text-green-400 font-bold">${revenue.mixed?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">100% Premium</p>
                  <p className="text-green-400 font-bold">${revenue.premium?.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cycle Duration */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-400" />
              Duración del Ciclo de Visión
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Duración (meses)
              </label>
              <input
                type="number"
                value={config.cycleDurationMonths}
                onChange={(e) => setConfig({ ...config, cycleDurationMonths: parseInt(e.target.value) })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                min="1"
                max="12"
              />
              <p className="text-gray-500 text-xs mt-1">
                Ejemplo: 6 meses para un semestre, 10 meses para ciclo escolar completo
              </p>
            </div>
          </div>

          {/* Renewal Settings */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Percent className="w-6 h-6 text-purple-400" />
              Oferta de Renovación (Retention Loop)
            </h3>

            <div className="space-y-4">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Activar Oferta de Renovación
                  </label>
                  <p className="text-gray-500 text-xs">
                    Ofrecer descuento a ex-alumnos cuando expire su licencia
                  </p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, renewalOfferEnabled: !config.renewalOfferEnabled })}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    config.renewalOfferEnabled ? 'bg-purple-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      config.renewalOfferEnabled ? 'translate-x-7' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Discount Percentage */}
              {config.renewalOfferEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Porcentaje de Descuento
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      value={config.renewalDiscount}
                      onChange={(e) => setConfig({ ...config, renewalDiscount: parseFloat(e.target.value) })}
                      className="flex-1"
                      min="0"
                      max="100"
                      step="5"
                    />
                    <span className="text-2xl font-bold text-purple-400 w-16 text-right">
                      {config.renewalDiscount}%
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    Ex-alumnos pagarán ${Math.round(800 * (1 - config.renewalDiscount / 100))} (Standard) 
                    o ${Math.round(2500 * (1 - config.renewalDiscount / 100))} (Premium)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                : 'bg-red-500/20 border border-red-500/50 text-red-400'
            }`}>
              <AlertCircle className="w-5 h-5" />
              <span>{message.text}</span>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </>
      )}
    </div>
  );
}
