'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Ticket,
  Plus,
  Copy,
  CheckCircle,
  Users,
  Calendar,
  Zap,
  QrCode
} from 'lucide-react';
import Link from 'next/link';

interface License {
  id: number;
  code: string;
  batchName: string | null;
  tierAssigned: 'FREE' | 'STANDARD' | 'PREMIUM';
  maxUses: number;
  usedCount: number;
  isMasterCode: boolean;
  expiresAt: string | null;
  isActive: boolean;
  autoAssignVision: string | null;
}

interface Organization {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string;
  contactEmail: string;
  status: string;
  totalLicenses: number;
  activeLicenses: number;
  totalStudents: number;
  standardLicensePrice?: number;
  premiumLicensePrice?: number;
  renewalOfferDiscount?: number;
  Usuario_Organization_schoolAdminIdToUsuario: {
    nombre: string;
    email: string;
  } | null;
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/admin/organizations/${organizationId}`);
      const data = await res.json();
      
      if (data.success) {
        setOrganization(data.organization);
        setLicenses(data.organization.Licenses || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Organización no encontrada</p>
          <Link
            href="/dashboard/admin/schools"
            className="text-purple-400 hover:text-purple-300"
          >
            ← Volver a organizaciones
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link
          href="/dashboard/admin/schools"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Volver a organizaciones</span>
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {organization.logoUrl ? (
              <img
                src={organization.logoUrl}
                alt={organization.name}
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center text-white font-bold text-3xl"
                style={{ backgroundColor: organization.brandColor }}
              >
                {organization.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{organization.name}</h1>
              <p className="text-slate-400">{organization.contactEmail}</p>
              {organization.Usuario_Organization_schoolAdminIdToUsuario && (
                <p className="text-slate-300">
                  Director: {organization.Usuario_Organization_schoolAdminIdToUsuario.nombre} ({organization.Usuario_Organization_schoolAdminIdToUsuario.email})
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-purple-500/50"
          >
            <Plus size={20} />
            <span className="font-semibold">Generar Licencias</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Ticket className="text-purple-400" size={24} />
            <span className="text-3xl font-bold text-white">
              {organization.totalLicenses}
            </span>
          </div>
          <p className="text-slate-400 text-sm">Licencias Creadas</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="text-green-400" size={24} />
            <span className="text-3xl font-bold text-white">
              {organization.activeLicenses}
            </span>
          </div>
          <p className="text-slate-400 text-sm">Licencias Activas</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="text-blue-400" size={24} />
            <span className="text-3xl font-bold text-white">
              {organization.totalStudents}
            </span>
          </div>
          <p className="text-slate-400 text-sm">Estudiantes Activos</p>
        </div>
      </div>

      {/* Licenses Table */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-2xl font-bold text-white">Licencias Generadas</h2>
            <p className="text-slate-400 mt-1">Códigos de acceso creados para esta organización</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                    Código
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                    Lote
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Tier
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Uso
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Expira
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {licenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Ticket className="mx-auto mb-4 text-slate-600" size={48} />
                      <p className="text-slate-400 mb-2">No hay licencias generadas</p>
                      <p className="text-slate-500 text-sm">
                        Haz clic en "Generar Licencias" para crear códigos de acceso
                      </p>
                    </td>
                  </tr>
                ) : (
                  licenses.map((license) => (
                    <tr
                      key={license.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <code className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-lg font-mono text-sm border border-purple-600/30">
                            {license.code}
                          </code>
                          <button
                            onClick={() => copyToClipboard(license.code)}
                            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                            title="Copiar código"
                          >
                            {copiedCode === license.code ? (
                              <CheckCircle size={16} className="text-green-400" />
                            ) : (
                              <Copy size={16} className="text-slate-400" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white text-sm">
                          {license.batchName || 'Sin nombre'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            license.tierAssigned === 'PREMIUM'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : license.tierAssigned === 'STANDARD'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          {license.tierAssigned}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`text-sm ${
                            license.isMasterCode ? 'text-purple-400' : 'text-blue-400'
                          }`}
                        >
                          {license.isMasterCode ? 'Maestro' : 'Único'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-white font-semibold text-sm">
                            {license.usedCount} / {license.maxUses}
                          </span>
                          <div className="w-full max-w-[80px] bg-slate-700 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-purple-500 h-1.5 rounded-full transition-all"
                              style={{
                                width: `${(license.usedCount / license.maxUses) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {license.expiresAt ? (
                          <span className="text-slate-400 text-sm">
                            {new Date(license.expiresAt).toLocaleDateString('es-MX')}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-sm">Sin expiración</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              copyToClipboard(
                                `${window.location.origin}/redeem?code=${license.code}`
                              )
                            }
                            className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors"
                            title="Copiar link de activación"
                          >
                            <Zap size={16} />
                          </button>
                          <button
                            className="p-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors"
                            title="Generar QR"
                          >
                            <QrCode size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Generate License Modal */}
      {showGenerateModal && (
        <GenerateLicenseModal
          organizationId={parseInt(organizationId)}
          organizationName={organization.name}
          standardPrice={organization.standardLicensePrice || 600}
          premiumPrice={organization.premiumLicensePrice || 1250}
          onClose={() => setShowGenerateModal(false)}
          onSuccess={() => {
            fetchData();
            setShowGenerateModal(false);
          }}
        />
      )}
    </div>
  );
}

// Generate License Modal Component
function GenerateLicenseModal({
  organizationId,
  organizationName,
  standardPrice,
  premiumPrice,
  onClose,
  onSuccess
}: {
  organizationId: number;
  organizationName: string;
  standardPrice: number;
  premiumPrice: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    batchName: `Inscripciones ${new Date().getFullYear()}`,
    tierAssigned: 'STANDARD' as 'STANDARD' | 'PREMIUM',
    codeType: 'MASTER' as 'MASTER' | 'UNIQUE',
    masterCode: '',
    maxUses: '100',
    uniqueCount: '50',
    expiresAt: '',
    autoAssignVision: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [generated, setGenerated] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        batchName: formData.batchName,
        tierAssigned: formData.tierAssigned,
        codeType: formData.codeType,
        ...(formData.codeType === 'MASTER'
          ? {
              masterCode: formData.masterCode.toUpperCase(),
              maxUses: parseInt(formData.maxUses)
            }
          : {
              uniqueCount: parseInt(formData.uniqueCount)
            }),
        ...(formData.expiresAt && { expiresAt: formData.expiresAt }),
        ...(formData.autoAssignVision && { autoAssignVision: formData.autoAssignVision })
      };

      const res = await fetch(`/api/admin/organizations/${organizationId}/licenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
        setGenerated(true);
      } else {
        setError(data.error || 'Error al generar licencias');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full">
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-400" size={32} />
              <div>
                <h2 className="text-2xl font-bold text-white">¡Licencias Generadas!</h2>
                <p className="text-slate-400 mt-1">{result.message}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">Códigos creados:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {result.licenses.map((lic: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-900/50 px-4 py-2 rounded-lg"
                  >
                    <code className="text-purple-300 font-mono">{lic.code}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(lic.activationLink);
                      }}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Copiar link
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
              <p className="text-sm text-purple-300 font-semibold mb-2">
                📱 Comparte con tus alumnos:
              </p>
              <p className="text-slate-300 text-sm">
                {result.licenses[0]?.activationLink || 'Link de activación'}
              </p>
            </div>
          </div>

          <div className="p-6 border-t border-slate-700 flex justify-end">
            <button
              onClick={onSuccess}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Finalizar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Generar Lote de Licencias</h2>
              <p className="text-slate-400 mt-1">Para {organizationName}</p>
            </div>
            <Link
              href={`/dashboard/admin/schools/edit/${organizationId}`}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-all text-sm"
              title="Configurar precios de licencias"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6m6-12v6m0 6v6m-12-18v6m0 6v6" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Configuración
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nombre del Lote *
            </label>
            <input
              type="text"
              required
              value={formData.batchName}
              onChange={(e) => setFormData({ ...formData, batchName: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              placeholder="Ej: Inscripciones Enero 2025"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tier de Servicio *
            </label>
            <select
              value={formData.tierAssigned}
              onChange={(e) =>
                setFormData({ ...formData, tierAssigned: e.target.value as any })
              }
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            >
              <option value="STANDARD">STANDARD - ${standardPrice.toFixed(2)} MXN</option>
              <option value="PREMIUM">PREMIUM - ${premiumPrice.toFixed(2)} MXN</option>
            </select>
            <p className="text-xs text-slate-500 mt-2">
              💡 Estos precios se configuran en la página de edición de la organización
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Tipo de Código *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, codeType: 'MASTER' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.codeType === 'MASTER'
                    ? 'border-purple-500 bg-purple-600/20'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <p className="text-white font-semibold mb-1">Código Maestro</p>
                <p className="text-slate-400 text-xs">
                  Un código, múltiples usos (recomendado)
                </p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, codeType: 'UNIQUE' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.codeType === 'UNIQUE'
                    ? 'border-purple-500 bg-purple-600/20'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <p className="text-white font-semibold mb-1">Códigos Únicos</p>
                <p className="text-slate-400 text-xs">
                  Generar N códigos distintos
                </p>
              </button>
            </div>
          </div>

          {formData.codeType === 'MASTER' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Código Maestro *
                </label>
                <input
                  type="text"
                  required
                  value={formData.masterCode}
                  onChange={(e) =>
                    setFormData({ ...formData, masterCode: e.target.value.toUpperCase() })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="Ej: TEC-2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Límite de Usos (Cupo) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="500"
                  min="1"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Cantidad de Códigos *
              </label>
              <input
                type="number"
                required
                value={formData.uniqueCount}
                onChange={(e) => setFormData({ ...formData, uniqueCount: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                placeholder="50"
                min="1"
                max="500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Fecha de Expiración (Opcional)
            </label>
            <input
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Auto-asignar Visión/Grupo (Opcional)
            </label>
            <input
              type="text"
              value={formData.autoAssignVision}
              onChange={(e) => setFormData({ ...formData, autoAssignVision: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              placeholder="Ej: Aula A, Generación 2025"
            />
            <p className="text-xs text-slate-500 mt-1">
              Los usuarios se asignarán automáticamente a este grupo
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || generated}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generando...' : generated ? '✅ Generadas' : 'Generar Licencias'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
