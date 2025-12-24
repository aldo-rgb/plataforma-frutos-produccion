'use client';

import { useState, useEffect } from 'react';
import { Building2, CreditCard, Plus, Calendar, DollarSign, TrendingUp } from 'lucide-react';

interface Organization {
  id: number;
  name: string;
  slug: string;
  status: string;
}

interface SchoolCredit {
  id: number;
  organizationId: number;
  planType: 'STANDARD' | 'PREMIUM';
  totalPurchased: number;
  totalAllocated: number;
  available: number;
  unitPrice: number;
  totalPaid: number;
  expirationDate: string | null;
  utilizationRate: string;
  createdAt: string;
  Organization: {
    id: number;
    name: string;
    slug: string;
    status: string;
  };
}

export default function SchoolCreditsPage() {
  const [credits, setCredits] = useState<SchoolCredit[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [creditsRes, orgsRes] = await Promise.all([
        fetch('/api/admin/school-credits'),
        fetch('/api/admin/organizations'),
      ]);

      const [creditsData, orgsData] = await Promise.all([
        creditsRes.json(),
        orgsRes.json(),
      ]);

      setCredits(creditsData);
      setOrganizations(orgsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="text-purple-400" size={32} />
            <h1 className="text-3xl font-bold text-white">
              🏦 Banco Central de Licencias
            </h1>
          </div>
          <p className="text-slate-400">
            Asigna créditos a escuelas para que generen códigos de acceso
          </p>
        </div>

        {/* Estadísticas Globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Total Vendidos</p>
              <TrendingUp className="text-green-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-white">
              {credits.reduce((sum, c) => sum + c.totalPurchased, 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Códigos Generados</p>
              <CreditCard className="text-blue-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-white">
              {credits.reduce((sum, c) => sum + c.totalAllocated, 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Disponibles</p>
              <Building2 className="text-purple-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-white">
              {credits.reduce((sum, c) => sum + c.available, 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Ingresos Totales</p>
              <DollarSign className="text-yellow-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-white">
              ${credits.reduce((sum, c) => sum + c.totalPaid, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Botón Asignar Créditos */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            <Plus size={20} />
            Asignar Créditos a Escuela
          </button>
        </div>

        {/* Tabla de Créditos */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                    Organización
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                    Plan
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Comprados
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Asignados
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Disponibles
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Uso %
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">
                    Monto Pagado
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Vencimiento
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {credits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      No hay créditos asignados. Crea el primer registro.
                    </td>
                  </tr>
                ) : (
                  credits.map((credit) => (
                    <tr
                      key={credit.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium">
                            {credit.Organization.name}
                          </p>
                          <p className="text-slate-500 text-sm">
                            {credit.Organization.slug}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            credit.planType === 'PREMIUM'
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                              : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {credit.planType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-white font-semibold">
                        {credit.totalPurchased.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center text-blue-400 font-semibold">
                        {credit.totalAllocated.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`font-bold ${
                            credit.available > 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}
                        >
                          {credit.available.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${
                                parseFloat(credit.utilizationRate) >= 90
                                  ? 'bg-red-500'
                                  : parseFloat(credit.utilizationRate) >= 70
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${credit.utilizationRate}%` }}
                            />
                          </div>
                          <span className="text-slate-400 text-sm">
                            {credit.utilizationRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-white font-semibold">
                        ${credit.totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {credit.expirationDate ? (
                          <div className="flex items-center justify-center gap-1 text-slate-400">
                            <Calendar size={14} />
                            <span className="text-sm">
                              {new Date(credit.expirationDate).toLocaleDateString('es-MX')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">Sin límite</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Asignar Créditos */}
      {showCreateModal && (
        <CreateCreditModal
          organizations={organizations}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            fetchData();
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

// Modal para crear asignación de créditos
function CreateCreditModal({
  organizations,
  onClose,
  onSuccess,
}: {
  organizations: Organization[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    organizationId: '',
    planType: 'STANDARD' as 'STANDARD' | 'PREMIUM',
    totalPurchased: '',
    unitPrice: '600',
    expirationDate: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/school-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: parseInt(formData.organizationId),
          planType: formData.planType,
          totalPurchased: parseInt(formData.totalPurchased),
          unitPrice: parseFloat(formData.unitPrice),
          expirationDate: formData.expirationDate || null,
          notes: formData.notes || null,
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al crear crédito');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Auto-calcular precio según el plan
  useEffect(() => {
    if (formData.planType === 'STANDARD') {
      setFormData((prev) => ({ ...prev, unitPrice: '600' }));
    } else {
      setFormData((prev) => ({ ...prev, unitPrice: '1250' }));
    }
  }, [formData.planType]);

  const totalAmount = parseInt(formData.totalPurchased || '0') * parseFloat(formData.unitPrice || '0');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">
            💳 Asignar Créditos de Licencias
          </h2>
          <p className="text-slate-400 mt-1">
            Vende créditos a una escuela para que genere códigos
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Escuela *
            </label>
            <select
              required
              value={formData.organizationId}
              onChange={(e) =>
                setFormData({ ...formData, organizationId: e.target.value })
              }
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="">Seleccionar escuela...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.slug})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tipo de Plan *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, planType: 'STANDARD' })
                }
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.planType === 'STANDARD'
                    ? 'border-blue-500 bg-blue-600/20'
                    : 'border-slate-700 bg-slate-800/50'
                }`}
              >
                <p className="text-white font-semibold">STANDARD</p>
                <p className="text-slate-400 text-sm">$600 MXN</p>
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, planType: 'PREMIUM' })
                }
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.planType === 'PREMIUM'
                    ? 'border-purple-500 bg-purple-600/20'
                    : 'border-slate-700 bg-slate-800/50'
                }`}
              >
                <p className="text-white font-semibold">PREMIUM</p>
                <p className="text-slate-400 text-sm">$1,250 MXN</p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Cantidad de Licencias *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.totalPurchased}
              onChange={(e) =>
                setFormData({ ...formData, totalPurchased: e.target.value })
              }
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              placeholder="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Precio Unitario (MXN) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.unitPrice}
              onChange={(e) =>
                setFormData({ ...formData, unitPrice: e.target.value })
              }
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>

          {/* Monto Total Calculado */}
          <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-4">
            <p className="text-slate-300 text-sm mb-1">Monto Total a Pagar</p>
            <p className="text-3xl font-bold text-white">
              ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Fecha de Expiración (Opcional)
            </label>
            <input
              type="date"
              value={formData.expirationDate}
              onChange={(e) =>
                setFormData({ ...formData, expirationDate: e.target.value })
              }
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Notas Internas (Opcional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
              placeholder="Ej: Pago completo, Factura #12345..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Asignar Créditos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
