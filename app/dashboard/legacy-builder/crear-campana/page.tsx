'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Heart,
  ArrowLeft,
  Loader2,
  Save,
  Eye,
  Upload,
  Video,
  Target,
  FileText,
  Sparkles,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Users,
  Calendar,
  Image as ImageIcon,
  X,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface ExistingCampaign {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  story: string | null;
  videoUrl: string | null;
  coverImage: string | null;
  goalAmount: number;
  raisedAmount: number;
  status: string;
  project: {
    id: number;
    title: string;
    slug: string;
    goalAmount: number;
    raisedAmount: number;
  };
  _count: {
    donations: number;
    members: number;
    expenses: number;
  };
}

interface AvailableProject {
  id: number;
  title: string;
  goalAmount: number;
  raisedAmount: number;
  category: string | null;
}

export default function CrearCampanaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const visionId = searchParams.get('visionId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingCampaign, setExistingCampaign] = useState<ExistingCampaign | null>(null);
  const [availableProjects, setAvailableProjects] = useState<AvailableProject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    story: '',
    goalAmount: '50000',
    videoUrl: '',
    coverImage: '',
    projectId: '',
    startDate: '',
    endDate: '',
  });

  // Validación
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user && visionId) {
      loadCampaignData();
    }
  }, [session, visionId]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/legacy-builder/campaigns/create?visionId=${visionId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al cargar datos');
        return;
      }

      setExistingCampaign(data.campaign);
      setAvailableProjects(data.availableProjects || []);

      // Si ya existe una campaña, cargar sus datos
      if (data.campaign) {
        setFormData({
          title: data.campaign.title || '',
          description: data.campaign.description || '',
          story: data.campaign.story || '',
          goalAmount: String(data.campaign.goalAmount) || '50000',
          videoUrl: data.campaign.videoUrl || '',
          coverImage: data.campaign.coverImage || '',
          projectId: String(data.campaign.project?.id) || '',
          startDate: data.campaign.startDate ? new Date(data.campaign.startDate).toISOString().split('T')[0] : '',
          endDate: data.campaign.endDate ? new Date(data.campaign.endDate).toISOString().split('T')[0] : '',
        });
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido';
    } else if (formData.title.length < 5) {
      newErrors.title = 'El título debe tener al menos 5 caracteres';
    }

    if (!formData.goalAmount || parseFloat(formData.goalAmount) < 1000) {
      newErrors.goalAmount = 'La meta mínima es $1,000 MXN';
    }

    if (formData.videoUrl && !isValidUrl(formData.videoUrl)) {
      newErrors.videoUrl = 'URL de video inválida';
    }

    if (formData.coverImage && !isValidUrl(formData.coverImage)) {
      newErrors.coverImage = 'URL de imagen inválida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/legacy-builder/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          visionId: parseInt(visionId!),
          projectId: formData.projectId ? parseInt(formData.projectId) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al crear campaña');
        return;
      }

      setSuccess('¡Campaña creada exitosamente!');
      setExistingCampaign(data.campaign);
      
      // Recargar datos
      await loadCampaignData();
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario escribe
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!visionId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Visión no especificada</h1>
          <p className="text-gray-400 mb-6">
            Se requiere especificar la visión para crear una campaña.
          </p>
          <Link
            href="/dashboard/legacy-vision-builder"
            className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver a Legacy Builder
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/dashboard/legacy-vision-builder"
            className="inline-flex items-center gap-2 text-pink-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Legacy Vision Builder
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {existingCampaign ? 'Gestionar Campaña' : 'Crear Campaña de Crowdfunding'}
              </h1>
              <p className="text-pink-200">
                Legacy Builder • Servicio Comunitario
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Mensajes de error/éxito */}
        {error && (
          <div className="bg-red-900/30 border border-red-600/50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-5 h-5 text-red-400 hover:text-red-300" />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-900/30 border border-green-600/50 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <p className="text-green-300">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto">
              <X className="w-5 h-5 text-green-400 hover:text-green-300" />
            </button>
          </div>
        )}

        {/* Si ya existe una campaña, mostrar resumen */}
        {existingCampaign && (
          <div className="bg-gradient-to-br from-pink-900/30 to-rose-900/30 rounded-2xl border border-pink-600/30 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-400" />
                  Tu Campaña Actual
                </h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  existingCampaign.status === 'ACTIVE' 
                    ? 'bg-green-900/50 text-green-400 border border-green-600/30'
                    : existingCampaign.status === 'DRAFT'
                    ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-600/30'
                    : 'bg-gray-800 text-gray-400 border border-gray-600'
                }`}>
                  {existingCampaign.status === 'ACTIVE' ? '🟢 Activa' : 
                   existingCampaign.status === 'DRAFT' ? '📝 Borrador' : 
                   existingCampaign.status}
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-4">{existingCampaign.title}</h3>

              {/* Progreso */}
              <div className="bg-gray-900/50 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Recaudado</span>
                  <span className="text-2xl font-bold text-white">
                    ${Number(existingCampaign.raisedAmount || 0).toLocaleString()} MXN
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden mb-2">
                  <div 
                    className="bg-gradient-to-r from-pink-500 to-rose-500 h-full rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(100, (Number(existingCampaign.raisedAmount || 0) / Number(existingCampaign.goalAmount)) * 100)}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    {Math.round((Number(existingCampaign.raisedAmount || 0) / Number(existingCampaign.goalAmount)) * 100)}% completado
                  </span>
                  <span className="text-gray-400">
                    Meta: ${Number(existingCampaign.goalAmount).toLocaleString()} MXN
                  </span>
                </div>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                  <DollarSign className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{existingCampaign._count?.donations || 0}</p>
                  <p className="text-xs text-gray-500">Donaciones</p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                  <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{existingCampaign._count?.members || 0}</p>
                  <p className="text-xs text-gray-500">Miembros</p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                  <FileText className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{existingCampaign._count?.expenses || 0}</p>
                  <p className="text-xs text-gray-500">Gastos</p>
                </div>
              </div>

              {/* Link público */}
              <div className="bg-gray-900/50 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-2">Link público de tu campaña:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-800 px-3 py-2 rounded-lg text-pink-400 text-sm truncate">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/legado/{existingCampaign.slug}
                  </code>
                  <a
                    href={`/legado/${existingCampaign.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-5 h-5 text-white" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-pink-400" />
                {existingCampaign ? 'Editar Información' : 'Información de la Campaña'}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Título */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Título de la Campaña *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Ej: Apoyo a Casa Hogar San José"
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-700'
                  }`}
                  disabled={saving}
                />
                {errors.title && (
                  <p className="text-red-400 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Descripción Breve
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="¿Cuál es el propósito de esta campaña? (2-3 oraciones)"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                  disabled={saving}
                />
              </div>

              {/* Historia */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Historia / Manifiesto
                </label>
                <textarea
                  value={formData.story}
                  onChange={(e) => handleInputChange('story', e.target.value)}
                  placeholder="Cuenta la historia detrás de este proyecto. ¿Por qué es importante? ¿Cómo impactará a la comunidad?"
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Meta Financiera */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-pink-400" />
                Meta Financiera
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Meta a Recaudar (MXN) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                  <input
                    type="number"
                    value={formData.goalAmount}
                    onChange={(e) => handleInputChange('goalAmount', e.target.value)}
                    placeholder="50000"
                    min="1000"
                    step="1000"
                    className={`w-full px-4 py-3 pl-10 bg-gray-800 border rounded-xl text-white text-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                      errors.goalAmount ? 'border-red-500' : 'border-gray-700'
                    }`}
                    disabled={saving}
                  />
                </div>
                {errors.goalAmount ? (
                  <p className="text-red-400 text-sm mt-1">{errors.goalAmount}</p>
                ) : (
                  <p className="text-gray-500 text-sm mt-1">Mínimo $1,000 MXN</p>
                )}
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Fecha de Inicio (opcional)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="w-full px-4 py-3 pl-12 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      disabled={saving}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Fecha de Fin (opcional)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="w-full px-4 py-3 pl-12 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Multimedia */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-pink-400" />
                Multimedia
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Video */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Video de Presentación (opcional)
                </label>
                <div className="relative">
                  <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="url"
                    value={formData.videoUrl}
                    onChange={(e) => handleInputChange('videoUrl', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className={`w-full px-4 py-3 pl-12 bg-gray-800 border rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                      errors.videoUrl ? 'border-red-500' : 'border-gray-700'
                    }`}
                    disabled={saving}
                  />
                </div>
                {errors.videoUrl && (
                  <p className="text-red-400 text-sm mt-1">{errors.videoUrl}</p>
                )}
                <p className="text-gray-500 text-sm mt-1">YouTube, Vimeo o cualquier video embebible</p>
              </div>

              {/* Imagen de portada */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Imagen de Portada (opcional)
                </label>
                <div className="relative">
                  <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="url"
                    value={formData.coverImage}
                    onChange={(e) => handleInputChange('coverImage', e.target.value)}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    className={`w-full px-4 py-3 pl-12 bg-gray-800 border rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                      errors.coverImage ? 'border-red-500' : 'border-gray-700'
                    }`}
                    disabled={saving}
                  />
                </div>
                {errors.coverImage && (
                  <p className="text-red-400 text-sm mt-1">{errors.coverImage}</p>
                )}
              </div>

              {/* Preview de imagen */}
              {formData.coverImage && isValidUrl(formData.coverImage) && (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-800">
                  <img
                    src={formData.coverImage}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Proyecto padre (si hay disponibles) */}
          {availableProjects.length > 0 && !existingCampaign && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-700">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-400" />
                  Proyecto Padre (opcional)
                </h2>
              </div>

              <div className="p-6">
                <p className="text-gray-400 text-sm mb-4">
                  Si tu organización tiene un proyecto macro, puedes vincular esta campaña a él.
                </p>
                <select
                  value={formData.projectId}
                  onChange={(e) => handleInputChange('projectId', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  disabled={saving}
                >
                  <option value="">Crear nuevo proyecto automáticamente</option>
                  {availableProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title} (Meta: ${Number(project.goalAmount).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Botón de guardar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {existingCampaign ? 'Guardar Cambios' : 'Crear Campaña'}
                </>
              )}
            </button>

            {existingCampaign && existingCampaign.status === 'DRAFT' && (
              <button
                type="button"
                className="px-6 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="w-5 h-5" />
                Publicar Campaña
              </button>
            )}
          </div>

          <p className="text-gray-500 text-sm text-center">
            {existingCampaign 
              ? 'Los cambios se guardarán inmediatamente.'
              : 'La campaña se creará como borrador. Podrás editarla y publicarla después.'}
          </p>
        </form>
      </div>
    </div>
  );
}
