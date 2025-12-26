'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, Users, BookOpen, MapPin, Eye, Upload } from 'lucide-react';
import Link from 'next/link';
import ConfirmModal from '@/components/ui/ConfirmModal';
import AlertModal from '@/components/ui/AlertModal';

interface Organization {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string;
  contactEmail: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TRIAL';
  isGeofenced: boolean;
  totalLicenses: number;
  activeLicenses: number;
  totalStudents: number;
  createdAt: string;
  SchoolAdmin: {
    id: number;
    nombre: string;
    email: string;
  } | null;
  _count: {
    Licenses: number;
    Users: number;
  };
}

export default function SchoolsManagementPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Estados para modales de confirmación y alerta
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    organizationId: number | null;
    organizationName: string;
  }>({
    isOpen: false,
    organizationId: null,
    organizationName: ''
  });
  
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

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
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrganization = async (id: number, name: string) => {
    // Abrir modal de confirmación
    setConfirmModal({
      isOpen: true,
      organizationId: id,
      organizationName: name
    });
  };

  const executeDelete = async () => {
    if (!confirmModal.organizationId) return;

    try {
      const res = await fetch(`/api/admin/organizations/${confirmModal.organizationId}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (data.success) {
        // Actualizar la lista de organizaciones
        setOrganizations(organizations.filter(org => org.id !== confirmModal.organizationId));
        
        // Mostrar mensaje de éxito
        setAlertModal({
          isOpen: true,
          message: 'Organización eliminada exitosamente',
          type: 'success'
        });
      } else {
        // Mostrar mensaje de error
        setAlertModal({
          isOpen: true,
          message: data.error || 'Error al eliminar la organización',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      setAlertModal({
        isOpen: true,
        message: 'Error de conexión al eliminar la organización',
        type: 'error'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
      INACTIVE: 'bg-red-500/20 text-red-400 border-red-500/30',
      TRIAL: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    };
    return colors[status as keyof typeof colors] || colors.ACTIVE;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Building2 className="text-purple-500" size={40} />
              Gestión de Organizaciones
            </h1>
            <p className="text-slate-400">
              Administra escuelas, empresas y sus licencias B2B
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-purple-500/50"
          >
            <Plus size={20} />
            <span className="font-semibold">Nueva Organización</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Building2 className="text-purple-400" size={24} />
            <span className="text-3xl font-bold text-white">
              {organizations.length}
            </span>
          </div>
          <p className="text-slate-400 text-sm">Organizaciones Totales</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="text-green-400" size={24} />
            <span className="text-3xl font-bold text-white">
              {organizations.reduce((sum, org) => sum + (org._count?.Users || 0), 0)}
            </span>
          </div>
          <p className="text-slate-400 text-sm">Estudiantes Activos</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="text-blue-400" size={24} />
            <span className="text-3xl font-bold text-white">
              {organizations.reduce((sum, org) => sum + (org._count?.Licenses || 0), 0)}
            </span>
          </div>
          <p className="text-slate-400 text-sm">Licencias Activas</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <MapPin className="text-orange-400" size={24} />
            <span className="text-3xl font-bold text-white">
              {organizations.filter(org => org.isGeofenced).length}
            </span>
          </div>
          <p className="text-slate-400 text-sm">Con Geofencing</p>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                    Organización
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                    DIRECTOR
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Estudiantes
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Licencias
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {organizations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Building2 className="mx-auto mb-4 text-slate-600" size={48} />
                      <p className="text-slate-400 mb-2">No hay organizaciones registradas</p>
                      <p className="text-slate-500 text-sm">
                        Crea tu primera organización para empezar
                      </p>
                    </td>
                  </tr>
                ) : (
                  organizations.map((org) => (
                    <tr
                      key={org.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {org.logoUrl ? (
                            <img
                              src={org.logoUrl}
                              alt={org.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                              style={{ backgroundColor: org.brandColor }}
                            >
                              {org.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-white font-semibold">{org.name}</p>
                            <p className="text-slate-400 text-sm">{org.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {org.SchoolAdmin ? (
                          <div>
                            <p className="text-white text-sm">{org.SchoolAdmin.nombre}</p>
                            <p className="text-slate-400 text-xs">{org.SchoolAdmin.email}</p>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm">Sin asignar</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                            org.status
                          )}`}
                        >
                          {org.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Users size={16} className="text-slate-400" />
                          <span className="text-white font-semibold">
                            {org.totalStudents}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-white font-semibold">
                            {org.activeLicenses} / {org.totalLicenses}
                          </span>
                          <div className="w-full max-w-[100px] bg-slate-700 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-purple-500 h-1.5 rounded-full transition-all"
                              style={{
                                width: `${
                                  org.totalLicenses > 0
                                    ? (org.activeLicenses / org.totalLicenses) * 100
                                    : 0
                                }%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/dashboard/admin/schools/${org.id}`}
                            className="p-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors group relative"
                            title="Gestionar licencias"
                          >
                            <BookOpen size={18} />
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Gestionar Licencias
                            </span>
                          </Link>
                          <Link
                            href={`/dashboard/admin/schools/edit/${org.id}`}
                            className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors group relative"
                            title="Editar organización"
                          >
                            <Edit size={18} />
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Editar
                            </span>
                          </Link>
                          <button
                            onClick={() => handleDeleteOrganization(org.id, org.name)}
                            className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors group relative"
                            title="Eliminar organización"
                          >
                            <Trash2 size={18} />
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Eliminar
                            </span>
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

      {/* Create Organization Modal */}
      {showCreateModal && (
        <CreateOrganizationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            fetchOrganizations();
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Modales de Confirmación y Alerta */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={executeDelete}
        title="¿Eliminar Organización?"
        message={`¿Estás seguro de que deseas eliminar "${confirmModal.organizationName}"? Esta acción no se puede deshacer.`}
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        type="danger"
        icon={<Trash2 size={32} />}
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}

// Modal Component
function CreateOrganizationModal({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
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
    standardLicensePrice: '600',
    premiumLicensePrice: '1250',
    renewalOfferDiscount: '50'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
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
          onSuccess();
          setSuccess(false);
        }, 1500);
      } else {
        setError(data.error || 'Error al crear organización');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">Nueva Organización</h2>
          <p className="text-slate-400 mt-1">Registra una nueva escuela o empresa</p>
          
          {/* Alerta de Coordinador Obligatorio */}
          <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm">
              <p className="text-amber-400 font-semibold">⚠️ Coordinador Obligatorio</p>
              <p className="text-amber-300/80 mt-1">
                Toda organización debe tener un Director/Coordinador asignado. Es un requisito obligatorio del sistema.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm">
                <p className="text-red-400 font-semibold">Error al crear organización</p>
                <p className="text-red-300/90 mt-1">{error}</p>
                {error.includes('ya es School Admin de otra organización') && (
                  <p className="text-red-200/70 text-xs mt-2">
                    💡 Restricción del sistema: Un usuario solo puede ser School Admin de una organización a la vez. Debes usar un email diferente o desasignar al usuario de su organización actual.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Información Básica</h3>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre de la Organización *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                placeholder="Ej: Tec de Monterrey"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email de Contacto/Coordinador *
              </label>
              <input
                type="email"
                required
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                placeholder="coordinador@escuela.com"
              />
              <p className="text-xs text-slate-500 mt-1">
                ⚠️ Se creará automáticamente un usuario <strong>COORDINADOR</strong> con este email o se asignará si ya existe
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email del School Admin (OBLIGATORIO) *
              </label>
              <input
                type="email"
                required
                value={formData.schoolAdminEmail}
                onChange={(e) => setFormData({ ...formData, schoolAdminEmail: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                placeholder="schooladmin@escuela.com"
              />
              <p className="text-xs text-slate-500 mt-1">
                ⚠️ Se creará automáticamente un usuario <strong>SCHOOL_ADMIN</strong> con este email o se asignará si ya existe
              </p>
            </div>
          </div>

          {/* Branding */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Branding</h3>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Logo de la Organización
              </label>
              
              {/* Preview del logo */}
              {formData.logoUrl && (
                <div className="mb-3 flex items-center gap-4">
                  <img
                    src={formData.logoUrl}
                    alt="Preview"
                    className="w-20 h-20 rounded-lg object-cover border-2 border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logoUrl: '' })}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              )}

              {/* Opciones para agregar logo */}
              <div className="space-y-3">
                {/* Opción 1: Subir archivo */}
                <div>
                  <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-slate-800/50 transition-colors">
                    <Upload size={20} className="text-slate-400" />
                    <span className="text-slate-400">Subir imagen desde computadora</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Convertir a base64 para preview
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({ ...formData, logoUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    PNG, JPG, GIF hasta 5MB
                  </p>
                </div>

                {/* Opción 2: URL externa */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-slate-900 text-slate-500">o usar URL</span>
                  </div>
                </div>
                
                <input
                  type="url"
                  value={formData.logoUrl.startsWith('data:') ? '' : formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="https://ejemplo.com/logo.png"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Color Institucional
              </label>
              <div className="flex items-center gap-4">
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
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="#6366F1"
                />
              </div>
            </div>
          </div>

          {/* Geofencing */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Geofencing (NFC)</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isGeofenced}
                  onChange={(e) =>
                    setFormData({ ...formData, isGeofenced: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {formData.isGeofenced && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Latitud
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.campusLatitude}
                    onChange={(e) =>
                      setFormData({ ...formData, campusLatitude: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    placeholder="25.651993"
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
                    onChange={(e) =>
                      setFormData({ ...formData, campusLongitude: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    placeholder="-100.289879"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Radio (metros)
                  </label>
                  <input
                    type="number"
                    value={formData.geofenceRadius}
                    onChange={(e) =>
                      setFormData({ ...formData, geofenceRadius: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    placeholder="100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pricing de Licencias */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              💰 Pricing de Licencias
            </h3>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-sm text-slate-400 mb-4">
                Cada licencia se vende por $150 MXN (por defecto) durante la duración de la visión. 
                Después, el usuario puede continuar en solitario pagando el 50% del costo asignado.
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
                      onChange={(e) =>
                        setFormData({ ...formData, standardLicensePrice: e.target.value })
                      }
                      className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
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
                      onChange={(e) =>
                        setFormData({ ...formData, premiumLicensePrice: e.target.value })
                      }
                      className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
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
                      onChange={(e) =>
                        setFormData({ ...formData, renewalOfferDiscount: e.target.value })
                      }
                      className="w-full pr-12 pl-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
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
          </div>

          {/* Actions */}
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
              disabled={loading || success}
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
                  ¡Creada!
                </>
              ) : loading ? (
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
                  Creando...
                </>
              ) : (
                'Crear Organización'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
