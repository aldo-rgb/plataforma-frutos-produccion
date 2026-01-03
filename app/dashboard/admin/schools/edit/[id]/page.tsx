'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Building2, ArrowLeft, Save, Upload, X, MapPin, Mail, Palette, Users, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Organization {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string;
  contactEmail: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TRIAL';
  isGeofenced: boolean;
  campusLatitude: number | null;
  campusLongitude: number | null;
  geofenceRadius: number;
  totalLicenses: number;
  activeLicenses: number;
  totalStudents: number;
  standardLicensePrice: number;
  premiumLicensePrice: number;
  renewalOfferDiscount: number;
  Usuario_Organization_schoolAdminIdToUsuario: {
    id: number;
    nombre: string;
    email: string;
  } | null;
}

export default function EditOrganizationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    contactEmail: '',
    schoolAdminEmail: '',
    brandColor: '#6366F1',
    logoUrl: '',
    isGeofenced: false,
    campusLatitude: '',
    campusLongitude: '',
    geofenceRadius: '100',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'TRIAL',
    standardLicensePrice: '600',
    premiumLicensePrice: '1250',
    renewalOfferDiscount: '50'
  });

  useEffect(() => {
    fetchOrganization();
  }, [id]);

  const fetchOrganization = async () => {
    try {
      const res = await fetch(`/api/admin/organizations/${id}`);
      const data = await res.json();
      
      if (data.success && data.organization) {
        const org = data.organization;
        setFormData({
          name: org.name,
          contactEmail: org.contactEmail,
          schoolAdminEmail: org.Usuario_Organization_schoolAdminIdToUsuario?.email || '',
          brandColor: org.brandColor || '#6366F1',
          logoUrl: org.logoUrl || '',
          isGeofenced: org.isGeofenced || false,
          campusLatitude: org.campusLatitude?.toString() || '',
          campusLongitude: org.campusLongitude?.toString() || '',
          geofenceRadius: org.geofenceRadius?.toString() || '100',
          status: org.status,
          standardLicensePrice: org.standardLicensePrice?.toString() || '600',
          premiumLicensePrice: org.premiumLicensePrice?.toString() || '1250',
          renewalOfferDiscount: org.renewalOfferDiscount?.toString() || '50'
        });
        
        if (org.logoUrl) {
          setUploadedImagePreview(org.logoUrl);
        }
      } else {
        setError('No se pudo cargar la organización');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setUploadedImagePreview(base64);
        setFormData({ ...formData, logoUrl: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/organizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          campusLatitude: formData.campusLatitude ? parseFloat(formData.campusLatitude) : null,
          campusLongitude: formData.campusLongitude ? parseFloat(formData.campusLongitude) : null,
          geofenceRadius: parseInt(formData.geofenceRadius) || 100,
          standardLicensePrice: formData.standardLicensePrice,
          premiumLicensePrice: formData.premiumLicensePrice,
          renewalOfferDiscount: formData.renewalOfferDiscount
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard/admin/schools');
        }, 1500);
      } else {
        setError(data.error || 'Error al actualizar organización');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/admin/schools"
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-white" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Building2 className="text-purple-400" size={32} />
                Editar Organización
              </h1>
              <p className="text-slate-400 mt-1">Actualiza la información de la institución</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-2xl overflow-hidden">
          {error && (
            <div className="m-6 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="m-6 bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg">
              ¡Organización actualizada exitosamente!
            </div>
          )}

          <div className="p-6 space-y-8">
            {/* Información Básica */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Building2 size={20} className="text-purple-400" />
                Información Básica
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nombre de la Organización *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ej: Universidad Nacional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Mail size={16} className="inline mr-1" />
                    Email de Contacto/Coordinador *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="coordinador@organizacion.com"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    ⚠️ Se creará automáticamente un usuario <strong>COORDINADOR</strong> con este email o se asignará si ya existe
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Users size={16} className="inline mr-1" />
                    Email del School Admin *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.schoolAdminEmail}
                    onChange={(e) => setFormData({ ...formData, schoolAdminEmail: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="schooladmin@organizacion.com"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    ⚠️ Se creará automáticamente un usuario <strong>SCHOOL_ADMIN</strong> con este email o se asignará si ya existe
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Estado
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                    <option value="TRIAL">Prueba</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Branding */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Palette size={20} className="text-purple-400" />
                Branding
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Logo de la Institución
                  </label>
                  <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 bg-slate-800/50">
                    <div className="flex flex-col items-center gap-4">
                      <Upload size={32} className="text-slate-500" />
                      <div className="text-center">
                        <label className="cursor-pointer inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                          <span>Seleccionar archivo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-slate-500 mt-2">PNG, JPG, GIF hasta 5MB</p>
                      </div>
                      
                      {uploadedImagePreview && (
                        <div className="relative">
                          <img
                            src={uploadedImagePreview}
                            alt="Preview"
                            className="w-24 h-24 rounded-lg object-cover border-2 border-purple-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedImagePreview(null);
                              setFormData({ ...formData, logoUrl: '' });
                            }}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      O ingresa una URL
                    </label>
                    <input
                      type="url"
                      value={formData.logoUrl}
                      onChange={(e) => {
                        setFormData({ ...formData, logoUrl: e.target.value });
                        setUploadedImagePreview(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="https://ejemplo.com/logo.png"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Color de Marca
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.brandColor}
                      onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                      className="h-12 w-20 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.brandColor}
                      onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                      className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="#6366F1"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Geolocalización */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <MapPin size={20} className="text-purple-400" />
                Geolocalización y Geofencing
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.isGeofenced}
                    onChange={(e) => setFormData({ ...formData, isGeofenced: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                  <label className="text-sm font-medium text-slate-300">
                    Activar restricción por geofencing
                  </label>
                </div>

                {formData.isGeofenced && (
                  <div className="pl-8 space-y-4 border-l-2 border-purple-600/30">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Latitud
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.campusLatitude}
                          onChange={(e) => setFormData({ ...formData, campusLatitude: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="-33.4489"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Longitud
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.campusLongitude}
                          onChange={(e) => setFormData({ ...formData, campusLongitude: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="-70.6693"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Radio del Geofence (metros)
                      </label>
                      <input
                        type="number"
                        value={formData.geofenceRadius}
                        onChange={(e) => setFormData({ ...formData, geofenceRadius: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="100"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Distancia permitida desde el campus (recomendado: 100-500 metros)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Pricing de Licencias */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                💰 Pricing de Licencias
              </h2>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <p className="text-sm text-slate-400 mb-4">
                  Cada licencia se vende por el precio configurado durante la duración de la visión. 
                  Después, el usuario puede continuar en solitario pagando el porcentaje de descuento aplicado.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Precio Licencia STANDARD (MXN)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.standardLicensePrice}
                        onChange={(e) => setFormData({ ...formData, standardLicensePrice: e.target.value })}
                        className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="150.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Precio Licencia PREMIUM (MXN)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.premiumLicensePrice}
                        onChange={(e) => setFormData({ ...formData, premiumLicensePrice: e.target.value })}
                        className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="150.00"
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Descuento Post-Visión (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.renewalOfferDiscount}
                        onChange={(e) => setFormData({ ...formData, renewalOfferDiscount: e.target.value })}
                        className="w-full pl-4 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        placeholder="50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Descuento aplicado cuando el usuario continúa solo después de completar su visión
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-purple-600/10 border border-purple-600/30 rounded-lg">
                  <p className="text-sm text-purple-300">
                    <strong>Ejemplo:</strong> Licencia STANDARD a ${formData.standardLicensePrice} MXN. 
                    Post-visión: ${(parseFloat(formData.standardLicensePrice || '0') * (1 - parseFloat(formData.renewalOfferDiscount || '0') / 100)).toFixed(2)} MXN/mes
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 p-6 bg-slate-800/50 border-t border-slate-700">
            <Link
              href="/dashboard/admin/schools"
              className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving || success}
              className={`px-6 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                success
                  ? 'bg-green-600 text-white'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
              }`}
            >
              {success ? (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  ¡Guardado!
                </>
              ) : saving ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
