'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Users, 
  Search, 
  Filter, 
  Plus,
  Edit,
  Eye,
  Trash2,
  FolderTree,
  X,
  Link2
} from 'lucide-react';

// Estilos globales para sobrescribir autocompletado del navegador
const inputStyles = `
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:active,
  textarea:-webkit-autofill,
  textarea:-webkit-autofill:hover,
  textarea:-webkit-autofill:focus,
  textarea:-webkit-autofill:active,
  select:-webkit-autofill,
  select:-webkit-autofill:hover,
  select:-webkit-autofill:focus,
  select:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 30px #0f1020 inset !important;
    -webkit-text-fill-color: #ffffff !important;
    caret-color: #ffffff !important;
    background-color: #0f1020 !important;
    transition: background-color 5000s ease-in-out 0s;
  }
  
  select option {
    background-color: #0f1020 !important;
    color: #ffffff !important;
  }
  
  input, textarea, select {
    color-scheme: dark;
  }
`;

interface MasterOrganization {
  id: number;
  name: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  organizationCount: number;
  totalLicenses: number;
}

interface Organization {
  id: number;
  nombre: string;
  slug: string;
  contactEmail: string | null;
  isActive: boolean;
  licenciasDisponibles: number;
  licenciasAsignadas: number;
  licenciasTotales: number;
  createdAt: string;
  MasterOrganization?: {
    id: number;
    name: string;
    logoUrl: string | null;
  } | null;
  Usuario_Organization_schoolAdminIdToUsuario: {
    id: number;
    nombre: string;
    email: string;
  };
}

export default function AdminSchoolsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [masterOrganizations, setMasterOrganizations] = useState<MasterOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMaster, setFilterMaster] = useState<string>('all');
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [newMaster, setNewMaster] = useState({
    name: '',
    description: '',
    logoUrl: ''
  });
  const [savingMaster, setSavingMaster] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selectedMasterId, setSelectedMasterId] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.rol !== 'ADMINISTRADOR') {
      router.push('/dashboard');
      return;
    }

    loadData();
  }, [session, status, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orgsRes, mastersRes] = await Promise.all([
        fetch('/api/admin/organizations'),
        fetch('/api/admin/master-organizations')
      ]);

      if (orgsRes.ok) {
        const orgsData = await orgsRes.json();
        // El API devuelve { success: true, organizations: [...] }
        setOrganizations(orgsData.organizations || orgsData);
      }

      if (mastersRes.ok) {
        const mastersData = await mastersRes.json();
        setMasterOrganizations(mastersData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMaster.name.trim()) {
      alert('El nombre es requerido');
      return;
    }

    try {
      setSavingMaster(true);
      const res = await fetch('/api/admin/master-organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaster)
      });

      if (res.ok) {
        await loadData();
        setShowMasterModal(false);
        setNewMaster({ name: '', description: '', logoUrl: '' });
        setLogoPreview(null);
      } else {
        const error = await res.json();
        alert(error.error || 'Error al crear la agrupación');
      }
    } catch (error) {
      console.error('Error creating master:', error);
      alert('Error al crear la agrupación');
    } finally {
      setSavingMaster(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB');
      return;
    }

    try {
      setUploadingLogo(true);

      // Preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'master-organizations');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Error al subir la imagen');
      }

      const data = await res.json();
      
      if (data.success && data.url) {
        setNewMaster({ ...newMaster, logoUrl: data.url });
      } else {
        throw new Error(data.error || 'Error al subir la imagen');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Error al subir la imagen. Por favor intenta nuevamente.');
      setLogoPreview(null);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setNewMaster({ ...newMaster, logoUrl: '' });
    setLogoPreview(null);
  };

  const handleDeleteMaster = async (masterId: number, masterName: string) => {
    if (!confirm(`¿Estás seguro de eliminar la agrupación "${masterName}"? Solo se puede eliminar si no tiene organizaciones asignadas.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/master-organizations/${masterId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al eliminar la agrupación');
      }
    } catch (error) {
      console.error('Error deleting master:', error);
      alert('Error al eliminar la agrupación');
    }
  };

  const handleOpenAffiliateModal = (org: Organization) => {
    setSelectedOrganization(org);
    setSelectedMasterId(org.MasterOrganization?.id?.toString() || '');
    setShowAffiliateModal(true);
  };

  const handleAffiliateOrganization = async () => {
    if (!selectedOrganization) return;

    try {
      const masterId = selectedMasterId ? parseInt(selectedMasterId) : null;
      
      const res = await fetch(`/api/admin/organizations/${selectedOrganization.id}/affiliate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterOrganizationId: masterId })
      });

      if (res.ok) {
        await loadData();
        setShowAffiliateModal(false);
        setSelectedOrganization(null);
        setSelectedMasterId('');
        alert('Organización actualizada correctamente');
      } else {
        const error = await res.json();
        alert(error.error || 'Error al afiliar la organización');
      }
    } catch (error) {
      console.error('Error affiliating organization:', error);
      alert('Error al afiliar la organización');
    }
  };

  const filteredOrganizations = organizations.filter(org => {
    const admin = org.Usuario_Organization_schoolAdminIdToUsuario;
    const matchesSearch = 
      (org.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (org.slug?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (admin?.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (admin?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMaster === 'all') return true;
    if (filterMaster === 'independent') return !org.MasterOrganization;
    return org.MasterOrganization?.id === parseInt(filterMaster);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0b14]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b14] p-6">
      <style jsx global>{inputStyles}</style>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Administración de Organizaciones
          </h1>
          <p className="text-gray-400">
            Gestiona las organizaciones institucionales y sus agrupaciones
          </p>
        </div>

        {/* Master Organizations Section */}
        <div className="bg-[#1a1b2e] rounded-lg border border-gray-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-semibold text-white">
                Agrupaciones Master
              </h2>
              <span className="text-sm text-gray-400">
                ({masterOrganizations.length})
              </span>
            </div>
            <button
              onClick={() => setShowMasterModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear Agrupación
            </button>
          </div>

          {masterOrganizations.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No hay agrupaciones creadas. Crea una para organizar tus instituciones.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {masterOrganizations.map((master) => (
                <div
                  key={master.id}
                  className="border border-gray-700 bg-[#0f1020] rounded-lg p-4 hover:border-green-500 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {master.logoUrl ? (
                        <img 
                          src={master.logoUrl} 
                          alt={master.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-green-500/10 rounded flex items-center justify-center">
                          <FolderTree className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                      <h3 className="font-semibold text-white">{master.name}</h3>
                    </div>
                    <button
                      onClick={() => handleDeleteMaster(master.id, master.name)}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Eliminar agrupación"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {master.description && (
                    <p className="text-sm text-gray-400 mb-3">{master.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      <span>{master.organizationCount} org{master.organizationCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{master.totalLicenses} lic.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Organizations Section */}
        <div className="bg-[#1a1b2e] rounded-lg border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-semibold text-white">
                Organizaciones
              </h2>
              <span className="text-sm text-gray-400">
                ({filteredOrganizations.length} de {organizations.length})
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, slug, director o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#0f1020] border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500"
              />
            </div>
            
            <div className="flex items-center gap-2 min-w-[250px]">
              <Filter className="text-gray-400 w-5 h-5" />
              <select
                value={filterMaster}
                onChange={(e) => setFilterMaster(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#0f1020] border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">Todas las organizaciones</option>
                <option value="independent">Independientes (sin agrupación)</option>
                {masterOrganizations.map((master) => (
                  <option key={master.id} value={master.id.toString()}>
                    {master.name} ({master.organizationCount})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Organizations Table */}
          {filteredOrganizations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {searchTerm || filterMaster !== 'all' 
                ? 'No se encontraron organizaciones con los filtros aplicados.'
                : 'No hay organizaciones registradas.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0f1020] border-b border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Organización
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Agrupación
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Director
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Licencias
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredOrganizations.map((org) => (
                    <tr key={org.id} className="hover:bg-[#0f1020] transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-white">{org.nombre}</div>
                          <div className="text-sm text-gray-400">{org.slug}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {org.MasterOrganization ? (
                          <div className="flex items-center gap-2">
                            {org.MasterOrganization.logoUrl ? (
                              <img 
                                src={org.MasterOrganization.logoUrl}
                                alt={org.MasterOrganization.name}
                                className="w-6 h-6 rounded object-cover"
                              />
                            ) : (
                              <FolderTree className="w-4 h-4 text-green-500" />
                            )}
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                              {org.MasterOrganization.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 italic">Independiente</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {org.Usuario_Organization_schoolAdminIdToUsuario.nombre}
                          </div>
                          <div className="text-sm text-gray-400">{org.Usuario_Organization_schoolAdminIdToUsuario.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <div className="text-sm">
                          <span className="font-medium text-green-400">{org.licenciasDisponibles}</span>
                          <span className="text-gray-500"> / </span>
                          <span className="text-gray-300">{org.licenciasTotales}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {org.licenciasAsignadas} asignadas
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          org.isActive 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                            : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                        }`}>
                          {org.isActive ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenAffiliateModal(org)}
                            className="text-purple-400 hover:text-purple-300 p-1"
                            title="Afiliar a agrupación"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/admin/schools/${org.id}`)}
                            className="text-blue-400 hover:text-blue-300 p-1"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/admin/schools/edit/${org.id}`)}
                            className="text-green-400 hover:text-green-300 p-1"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Master Modal */}
      {showMasterModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-[#1a1b2e] border border-gray-700 rounded-lg max-w-md w-full p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">
                Crear Agrupación Master
              </h3>
              <button
                onClick={() => {
                  setShowMasterModal(false);
                  setLogoPreview(null);
                  setNewMaster({ name: '', description: '', logoUrl: '' });
                }}
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMaster}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Nombre <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newMaster.name}
                    onChange={(e) => setNewMaster({ ...newMaster, name: e.target.value })}
                    placeholder="Ej: Frutos Monterrey, Movimiento Nacional..."
                    className="w-full px-3 py-2 bg-[#0f1020] border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={newMaster.description}
                    onChange={(e) => setNewMaster({ ...newMaster, description: e.target.value })}
                    placeholder="Descripción opcional de la agrupación..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#0f1020] border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Logo de la Agrupación
                  </label>
                  
                  {logoPreview || newMaster.logoUrl ? (
                    <div className="relative inline-block">
                      <img 
                        src={logoPreview || newMaster.logoUrl} 
                        alt="Logo preview"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-[#0f1020] hover:bg-[#151628] transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {uploadingLogo ? (
                            <>
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-2"></div>
                              <p className="text-sm text-gray-300">Subiendo imagen...</p>
                            </>
                          ) : (
                            <>
                              <Plus className="w-8 h-8 mb-2 text-gray-400" />
                              <p className="text-sm text-gray-300">
                                <span className="font-semibold">Click para subir</span> o arrastra
                              </p>
                              <p className="text-xs text-gray-500 mt-1">PNG, JPG o GIF (MAX. 5MB)</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowMasterModal(false);
                    setLogoPreview(null);
                    setNewMaster({ name: '', description: '', logoUrl: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                  disabled={savingMaster || uploadingLogo}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  disabled={savingMaster || uploadingLogo}
                >
                  {savingMaster ? 'Creando...' : 'Crear Agrupación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Affiliate Organization Modal */}
      {showAffiliateModal && selectedOrganization && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-[#1a1b2e] border border-gray-700 rounded-lg max-w-md w-full p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">
                Afiliar Organización
              </h3>
              <button
                onClick={() => {
                  setShowAffiliateModal(false);
                  setSelectedOrganization(null);
                  setSelectedMasterId('');
                }}
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="p-3 bg-[#0f1020] border border-gray-700 rounded-lg mb-4">
                <div className="text-sm text-gray-400 mb-1">Organización</div>
                <div className="font-medium text-white">{selectedOrganization.nombre}</div>
                <div className="text-sm text-gray-400">{selectedOrganization.slug}</div>
              </div>

              {selectedOrganization.MasterOrganization && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <FolderTree className="w-4 h-4" />
                    <span className="text-sm font-medium">Actualmente afiliada a:</span>
                  </div>
                  <div className="text-white font-medium mt-1">
                    {selectedOrganization.MasterOrganization.name}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Selecciona Agrupación
                </label>
                <select
                  value={selectedMasterId}
                  onChange={(e) => setSelectedMasterId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0f1020] border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Sin agrupación (Independiente)</option>
                  {masterOrganizations.map((master) => (
                    <option key={master.id} value={master.id.toString()}>
                      {master.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Selecciona una agrupación para afiliar esta organización, o deja en "Sin agrupación" para que sea independiente.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAffiliateModal(false);
                  setSelectedOrganization(null);
                  setSelectedMasterId('');
                }}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAffiliateOrganization}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Actualizar Afiliación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
