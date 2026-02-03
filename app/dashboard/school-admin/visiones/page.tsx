'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Search,
  Filter,
  Package,
  ArrowLeft,
  UserPlus,
  CreditCard,
  Calendar,
  Activity
} from 'lucide-react';
import Link from 'next/link';

interface Vision {
  id: number;
  nombre: string;
  descripcion: string | null;
  organizationId: number;
  maxParticipantes: number | null;
  licensesAllocated: number;
  isActive: boolean;
  createdAt: string;
  _count: {
    Participantes: number;
    GameChangers: number;
  };
}

export default function VisionesSchoolAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visiones, setVisiones] = useState<Vision[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBasicVisionModal, setShowBasicVisionModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdVisionId, setCreatedVisionId] = useState<number | null>(null);
  const [availableCredits, setAvailableCredits] = useState(0);
  const [coordinadores, setCoordinadores] = useState<Array<{ id: number; nombre: string; email: string; rol: string }>>([]);
  const [trainers, setTrainers] = useState<Array<{ id: number; nombre: string; email: string }>>([]);
  const [loadingCoordinadores, setLoadingCoordinadores] = useState(false);
  const [creatingVision, setCreatingVision] = useState(false);
  const [productPrices, setProductPrices] = useState({
    basicPrice: 1250,
    advancedPrice: 1750,
    plPrice: 2500,
  });

  const [organizationInfo, setOrganizationInfo] = useState<{
    name: string;
    city?: string;
    defaultLocation?: string;
  } | null>(null);

  // Estados para Vision Builder (Nueva visión básico)
  const [basicVisionData, setBasicVisionData] = useState({
    nombre: '',
    colorIdentificador: '#8B5CF6',
    // Básico
    basicStartDate: '',
    basicEndDate: '',
    basicCoordinatorId: '',
    basicTrainerId: '',
    basicLocation: '',
    basicCosto: 0, // Se actualizará con fetchProductPrices
    // Avanzado
    advancedStartDate: '',
    advancedEndDate: '',
    advancedCoordinatorId: '',
    advancedTrainerId: '',
    advancedLocation: '',
    advancedCosto: 0, // Se actualizará con fetchProductPrices
    // Programa Liderato
    plCoordinatorId: '',
    plCosto: 0, // Se actualizará con fetchProductPrices
    plWeekends: [
      { id: 1, name: 'Fin de Semana 1', startDate: '', endDate: '', trainerId: '', location: '' },
      { id: 2, name: 'Fin de Semana 2', startDate: '', endDate: '', trainerId: '', location: '' },
      { id: 3, name: 'Fin de Semana 3 (Graduación)', startDate: '', endDate: '', trainerId: '', location: 'Secreta' },
    ]
  });

  // Form states
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    maxParticipantes: 30,
    coordinadorId: '',
    startDate: '',
    endDate: '',
    forceFinanzasArea: true,
    forceRelacionesArea: true,
    forceTalentosArea: true,
    forceSaludArea: true,
    forcePazMentalArea: true,
    forceOcioArea: true,
    forceTransformationArea: true,
    transformationGuestsTarget: 4,
    forceCommunityServiceArea: true,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (!['SCHOOL_ADMIN', 'COORDINADOR'].includes(session?.user?.rol || '')) {
      router.push('/dashboard');
    } else {
      fetchVisiones();
      fetchCredits();
      fetchCoordinadores();
      fetchTrainers();
      fetchProductPrices();
      fetchOrganizationInfo();
      
      // Detectar si se debe abrir el modal de Vision Builder o Liderato
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('openModal') === 'vision-builder') {
        setShowBasicVisionModal(true);
        // Limpiar el parámetro de la URL sin recargar la página
        window.history.replaceState({}, '', '/dashboard/school-admin/visiones');
      } else if (urlParams.get('openModal') === 'liderato') {
        setShowCreateModal(true);
        // Limpiar el parámetro de la URL sin recargar la página
        window.history.replaceState({}, '', '/dashboard/school-admin/visiones');
      }
    }
  }, [status, session]);

  const fetchVisiones = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/school-admin/visiones');
      const data = await res.json();

      if (data.success) {
        setVisiones(data.visiones);
      }
    } catch (error) {
      console.error('Error fetching visiones:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCredits = async () => {
    try {
      const res = await fetch('/api/school-admin/dashboard');
      const data = await res.json();
      if (data.success) {
        setAvailableCredits(data.stats.availableCredits || 0);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const fetchOrganizationInfo = async () => {
    try {
      const res = await fetch('/api/school-admin/dashboard');
      const data = await res.json();
      if (data.success && data.organization) {
        const orgInfo = {
          name: data.organization.name,
          city: data.organization.city,
          defaultLocation: data.organization.city || data.organization.name
        };
        setOrganizationInfo(orgInfo);
        
        // Establecer ubicación por defecto en basicVisionData
        setBasicVisionData(prev => ({
          ...prev,
          basicLocation: orgInfo.defaultLocation || '',
          advancedLocation: orgInfo.defaultLocation || '',
          plWeekends: prev.plWeekends.map(w => ({
            ...w,
            location: w.location || orgInfo.defaultLocation || ''
          }))
        }));
      }
    } catch (error) {
      console.error('Error fetching organization info:', error);
    }
  };

  const fetchProductPrices = async () => {
    try {
      console.log('🔍 Fetching default prices...');
      const res = await fetch('/api/school-admin/default-prices');
      const data = await res.json();
      console.log('📦 Default prices response:', data);
      
      if (data.success && data.prices && data.prices.length > 0) {
        const basicPrice = data.prices.find((p: any) => p.levelType === 'BASIC');
        const advancedPrice = data.prices.find((p: any) => p.levelType === 'ADVANCED');
        const plPrice = data.prices.find((p: any) => p.levelType === 'PL');

        console.log('💰 Found prices:', { basicPrice, advancedPrice, plPrice });

        const newPrices = {
          basicPrice: basicPrice?.basePrice || 1250,
          advancedPrice: advancedPrice?.basePrice || 1750,
          plPrice: plPrice?.basePrice || 2500,
          currency: (basicPrice?.currency || 'MXN') as 'MXN' | 'USD',
        };

        console.log('✅ Setting prices:', newPrices);
        setProductPrices(newPrices);

        // Actualizar los precios en basicVisionData
        setBasicVisionData(prev => ({
          ...prev,
          basicCosto: newPrices.basicPrice,
          advancedCosto: newPrices.advancedPrice,
          plCosto: newPrices.plPrice,
        }));
      } else {
        console.warn('⚠️ No default prices found, using defaults');
        // Si no hay precios configurados, usar valores por defecto
        const defaultPrices = {
          basicPrice: 1250,
          advancedPrice: 1750,
          plPrice: 2500,
          currency: 'MXN' as 'MXN' | 'USD',
        };
        setProductPrices(defaultPrices);
        setBasicVisionData(prev => ({
          ...prev,
          basicCosto: defaultPrices.basicPrice,
          advancedCosto: defaultPrices.advancedPrice,
          plCosto: defaultPrices.plPrice,
        }));
      }
    } catch (error) {
      console.error('❌ Error fetching product prices:', error);
      // En caso de error, usar valores por defecto
      const defaultPrices = {
        basicPrice: 1250,
        advancedPrice: 1750,
        plPrice: 2500,
        currency: 'MXN' as 'MXN' | 'USD',
      };
      setProductPrices(defaultPrices);
      setBasicVisionData(prev => ({
        ...prev,
        basicCosto: defaultPrices.basicPrice,
        advancedCosto: defaultPrices.advancedPrice,
        plCosto: defaultPrices.plPrice,
      }));
    }
  };

  const fetchCoordinadores = async () => {
    try {
      setLoadingCoordinadores(true);
      const res = await fetch('/api/school-admin/coordinadores');
      const data = await res.json();
      if (data.success) {
        // Guardar TODOS los coordinadores (el filtro se hace en cada selector según necesidad)
        setCoordinadores(data.coordinadores || []);
      }
    } catch (error) {
      console.error('Error fetching coordinadores:', error);
    } finally {
      setLoadingCoordinadores(false);
    }
  };

  // Cargar trainers desde el API global (trainers no pertenecen a una organización)
  const fetchTrainers = async () => {
    try {
      const res = await fetch('/api/admin/trainers');
      const data = await res.json();
      if (data.success) {
        setTrainers(data.trainers || []);
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
    }
  };

  const addPLWeekend = () => {
    setBasicVisionData(prev => ({
      ...prev,
      plWeekends: [
        ...prev.plWeekends,
        {
          id: prev.plWeekends.length + 1,
          name: `Fin de Semana ${prev.plWeekends.length + 1}`,
          startDate: '',
          endDate: '',
          trainerId: '',
          location: ''
        }
      ]
    }));
  };

  const removePLWeekend = (id: number) => {
    setBasicVisionData(prev => ({
      ...prev,
      plWeekends: prev.plWeekends.filter(w => w.id !== id)
    }));
  };

  const updatePLWeekend = (id: number, field: string, value: string) => {
    setBasicVisionData(prev => ({
      ...prev,
      plWeekends: prev.plWeekends.map(w =>
        w.id === id ? { ...w, [field]: value } : w
      )
    }));
  };

  const handleCompleteVisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (creatingVision) return;

    // Validar campos requeridos
    if (!basicVisionData.nombre.trim()) {
      alert('Por favor ingresa el nombre de la visión');
      return;
    }

    if (!basicVisionData.basicStartDate || !basicVisionData.basicEndDate) {
      alert('Por favor configura las fechas del Nivel Básico');
      return;
    }

    if (!basicVisionData.advancedStartDate || !basicVisionData.advancedEndDate) {
      alert('Por favor configura las fechas del Nivel Avanzado');
      return;
    }

    try {
      setCreatingVision(true);
      
      // Crear la estructura de datos para enviar al API
      const visionData = {
        nombre: basicVisionData.nombre,
        colorIdentificador: basicVisionData.colorIdentificador,
        descripcion: null,
        maxParticipantes: 100,
        enabledLevels: ['BASIC', 'ADVANCED', 'PL'],
        currency: productPrices.currency, // Enviar la moneda detectada
        
        // Nivel Básico
        basicConfig: {
          startDate: basicVisionData.basicStartDate,
          endDate: basicVisionData.basicEndDate,
          coordinatorId: basicVisionData.basicCoordinatorId ? parseInt(basicVisionData.basicCoordinatorId) : null,
          trainerId: basicVisionData.basicTrainerId ? parseInt(basicVisionData.basicTrainerId) : null,
          location: basicVisionData.basicLocation,
          price: basicVisionData.basicCosto
        },
        
        // Nivel Avanzado
        advancedConfig: {
          startDate: basicVisionData.advancedStartDate,
          endDate: basicVisionData.advancedEndDate,
          coordinatorId: basicVisionData.advancedCoordinatorId ? parseInt(basicVisionData.advancedCoordinatorId) : null,
          trainerId: basicVisionData.advancedTrainerId ? parseInt(basicVisionData.advancedTrainerId) : null,
          location: basicVisionData.advancedLocation,
          price: basicVisionData.advancedCosto
        },
        
        // Programa Liderato
        plConfig: {
          coordinatorId: basicVisionData.plCoordinatorId ? parseInt(basicVisionData.plCoordinatorId) : null,
          price: basicVisionData.plCosto,
          weekends: basicVisionData.plWeekends.map(w => ({
            name: w.name,
            startDate: w.startDate,
            endDate: w.endDate,
            trainerId: w.trainerId ? parseInt(w.trainerId) : null,
            location: w.location
          }))
        }
      };

      const res = await fetch('/api/school-admin/visiones/create-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visionData),
      });

      const data = await res.json();

      if (data.success) {
        setShowBasicVisionModal(false);
        setCreatedVisionId(data.vision.id);
        setShowSuccessModal(true);
      } else {
        setErrorMessage(data.error || 'No se pudo crear la visión. Por favor verifica los datos e intenta nuevamente.');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error creating complete vision:', error);
      setErrorMessage('Error al crear la visión completa. Por favor intenta nuevamente o contacta al soporte técnico.');
      setShowErrorModal(true);
    } finally {
      setCreatingVision(false);
    }
  };

  const handleCreateVision = async (e: React.FormEvent) => {
    e.preventDefault();

    if (creatingVision) return; // Prevenir múltiples envíos

    try {
      setCreatingVision(true);
      const res = await fetch('/api/school-admin/visiones/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setShowCreateModal(false);
        setFormData({ 
          nombre: '', 
          descripcion: '', 
          maxParticipantes: 30,
          coordinadorId: '',
          startDate: '',
          endDate: '',
          forceFinanzasArea: true,
          forceRelacionesArea: true,
          forceTalentosArea: true,
          forceSaludArea: true,
          forcePazMentalArea: true,
          forceOcioArea: true,
          forceTransformationArea: true,
          transformationGuestsTarget: 4,
          forceCommunityServiceArea: true,
        });
        fetchVisiones();
      } else {
        alert(data.error || 'Error al crear la visión');
      }
    } catch (error) {
      console.error('Error creating vision:', error);
      alert('Error al crear la visión');
    } finally {
      setCreatingVision(false);
    }
  };

  const filteredVisiones = visiones.filter((vision) =>
    vision.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/dashboard/school-admin"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="text-slate-400" size={20} />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">
                Gestión de Visiones/Grupos
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm">
                Crea y gestiona visiones para tu organización
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/school-admin/productos"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={18} />
            Crear Nueva Visión
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-slate-900/50 backdrop-blur border border-purple-500/30 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-purple-400" size={24} />
              <span className="text-3xl font-bold text-purple-400">
                {visiones.length}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Visiones Activas</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-emerald-500/30 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="text-emerald-400" size={24} />
              <span className="text-3xl font-bold text-emerald-400">
                {availableCredits}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Licencias Disponibles</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar visiones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Visiones Grid */}
        {filteredVisiones.length === 0 ? (
          <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-12 text-center">
            <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">No hay visiones creadas</p>
            <p className="text-slate-500 text-sm mb-6">
              Crea tu primera visión para comenzar a gestionar participantes
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              <Plus size={20} />
              Crear Primera Visión
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {filteredVisiones.map((vision) => (
              <div
                key={vision.id}
                className="bg-slate-900/50 backdrop-blur border border-slate-700 hover:border-purple-500/50 rounded-xl p-4 sm:p-6 transition-all hover:shadow-lg hover:shadow-purple-500/10"
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">
                      {vision.nombre}
                    </h3>
                    {vision.descripcion && vision.descripcion !== 'Visión completa generada con Vision Builder' && (
                      <p className="text-slate-400 text-xs sm:text-sm line-clamp-1 sm:line-clamp-2">
                        {vision.descripcion}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                      vision.isActive
                        ? 'bg-green-900/20 text-green-400 border border-green-600'
                        : 'bg-gray-900/20 text-gray-400 border border-gray-600'
                    }`}
                  >
                    {vision.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-400">Participantes:</span>
                    <span className="text-purple-400 font-semibold">
                      {vision._count.Participantes}
                      {vision.maxParticipantes && ` / ${vision.maxParticipantes}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-400">Game Changers:</span>
                    <span className="text-cyan-400 font-semibold">
                      {vision._count.GameChangers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-400">Licencias Asignadas:</span>
                    <span className="text-emerald-400 font-semibold">
                      {vision.licensesAllocated}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-400">Creada:</span>
                    <span className="text-slate-400 font-medium">
                      {new Date(vision.createdAt).toLocaleDateString('es-MX')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2">
                  <Link
                    href={`/dashboard/school-admin/vision/${vision.id}/manage`}
                    className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors"
                  >
                    <Eye size={14} className="sm:w-4 sm:h-4" />
                    Ver Detalles Visión
                  </Link>
                  <Link
                    href={`/dashboard/school-admin/visiones/${vision.id}`}
                    className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors"
                  >
                    <Users size={14} className="sm:w-4 sm:h-4" />
                    Ver Detalles Liderato
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Vision Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 sm:p-6 max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
              Crear Nueva Visión
            </h2>

            <form onSubmit={handleCreateVision} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                  Nombre de la Visión *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  className="w-full px-3 sm:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm sm:text-base text-white focus:outline-none focus:border-purple-500"
                  placeholder="Ej: Generación 2025-A"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 sm:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm sm:text-base text-white focus:outline-none focus:border-purple-500"
                  placeholder="Descripción de la visión..."
                />
              </div>

              {/* Selector de Coordinador */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                  Coordinador Asignado *
                </label>
                {loadingCoordinadores ? (
                  <div className="flex items-center justify-center py-4 bg-slate-800 border border-slate-700 rounded-lg">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    <span className="ml-2 text-slate-400">Cargando coordinadores...</span>
                  </div>
                ) : coordinadores.length === 0 ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-yellow-400 text-sm">
                      ⚠️ No hay coordinadores disponibles en tu organización. Necesitas crear usuarios con rol COORDINADOR primero.
                    </p>
                  </div>
                ) : (
                  <select
                    required
                    value={formData.coordinadorId}
                    onChange={(e) =>
                      setFormData({ ...formData, coordinadorId: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm sm:text-base text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Selecciona un coordinador...</option>
                    {coordinadores.map((coord) => (
                      <option key={coord.id} value={coord.id}>
                        {coord.nombre} ({coord.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                  Máximo de Participantes
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxParticipantes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxParticipantes: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 sm:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm sm:text-base text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Fechas de la Visión */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm sm:text-base text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                    Fecha de Fin *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm sm:text-base text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Banner de información de fechas */}
              {(formData.startDate || formData.endDate) && (
                <div className="bg-purple-600/10 border border-purple-500/30 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Calendar className="text-purple-400 shrink-0 mt-0.5" size={16} />
                    <div className="flex-1">
                      <h4 className="text-purple-300 font-semibold text-xs sm:text-sm mb-1 sm:mb-2">
                        Período de la Visión
                      </h4>
                      <div className="space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
                        {formData.startDate && (
                          <p className="text-slate-300">
                            <span className="text-slate-400">Inicio:</span>{' '}
                            <span className="font-semibold">
                              {new Date(formData.startDate + 'T00:00:00').toLocaleDateString('es-MX', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </p>
                        )}
                        {formData.endDate && (
                          <p className="text-slate-300">
                            <span className="text-slate-400">Fin:</span>{' '}
                            <span className="font-semibold">
                              {new Date(formData.endDate + 'T00:00:00').toLocaleDateString('es-MX', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </p>
                        )}
                        {formData.startDate && formData.endDate && (
                          <p className="text-purple-300 font-semibold mt-2">
                            Duración: {Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24))} días
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Separador */}
              <div className="border-t border-slate-700 my-6"></div>

              {/* Configuración de Áreas Obligatorias */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Users size={18} className="text-purple-400 sm:w-5 sm:h-5" />
                  Áreas Obligatorias del Wizard
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm -mt-1 sm:-mt-2">
                  Configura qué áreas serán obligatorias para todos los participantes de esta visión
                </p>

                {/* Área de Finanzas */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <label className="text-sm sm:text-base font-semibold text-white flex items-center gap-1.5 sm:gap-2">
                        💰 Finanzas
                      </label>
                      <p className="text-slate-400 text-xs sm:text-sm mt-0.5 sm:mt-1">
                        Declaración y meta de abundancia financiera
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          forceFinanzasArea: !formData.forceFinanzasArea,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.forceFinanzasArea
                          ? 'bg-purple-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.forceFinanzasArea
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Área de Relaciones */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="text-base font-semibold text-white flex items-center gap-2">
                        ❤️ Relaciones
                      </label>
                      <p className="text-slate-400 text-sm mt-1">
                        Construcción de vínculos genuinos y significativos
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          forceRelacionesArea: !formData.forceRelacionesArea,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.forceRelacionesArea
                          ? 'bg-purple-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.forceRelacionesArea
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Área de Talentos */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <label className="text-sm sm:text-base font-semibold text-white flex items-center gap-1.5 sm:gap-2">
                        🎨 Talentos
                      </label>
                      <p className="text-slate-400 text-xs sm:text-sm mt-0.5 sm:mt-1">
                        Desarrollo de habilidades y creatividad personal
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          forceTalentosArea: !formData.forceTalentosArea,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.forceTalentosArea
                          ? 'bg-purple-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.forceTalentosArea
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Área de Salud */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <label className="text-sm sm:text-base font-semibold text-white flex items-center gap-1.5 sm:gap-2">
                        💪 Salud
                      </label>
                      <p className="text-slate-400 text-xs sm:text-sm mt-0.5 sm:mt-1">
                        Cuidado del bienestar físico y energía vital
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          forceSaludArea: !formData.forceSaludArea,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.forceSaludArea
                          ? 'bg-purple-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.forceSaludArea
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Área de Paz Mental */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <label className="text-sm sm:text-base font-semibold text-white flex items-center gap-1.5 sm:gap-2">
                        🧘 Paz Mental
                      </label>
                      <p className="text-slate-400 text-xs sm:text-sm mt-0.5 sm:mt-1">
                        Cultivo de serenidad y equilibrio emocional
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          forcePazMentalArea: !formData.forcePazMentalArea,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.forcePazMentalArea
                          ? 'bg-purple-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.forcePazMentalArea
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Área de Ocio */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <label className="text-sm sm:text-base font-semibold text-white flex items-center gap-1.5 sm:gap-2">
                        🎮 Ocio
                      </label>
                      <p className="text-slate-400 text-xs sm:text-sm mt-0.5 sm:mt-1">
                        Disfrute consciente y tiempo de descanso
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          forceOcioArea: !formData.forceOcioArea,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.forceOcioArea
                          ? 'bg-purple-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.forceOcioArea
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Área de Servicio a Transformación (Invitados) */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 sm:p-4 sm:p-5 space-y-3 sm:space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <label className="text-base font-semibold text-white flex items-center gap-2">
                        🎯 Servicio a Transformación (Invitados)
                      </label>
                      <p className="text-slate-400 text-sm mt-1">
                        Los participantes deberán invitar personas al programa
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          forceTransformationArea: !formData.forceTransformationArea,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.forceTransformationArea
                          ? 'bg-purple-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.forceTransformationArea
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {formData.forceTransformationArea && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Meta de invitados efectivos *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={formData.transformationGuestsTarget}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            transformationGuestsTarget: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-amber-400 text-xs mt-2 flex items-start gap-2">
                        <span className="text-base">⚠️</span>
                        <span>
                          Esto creará <strong>{formData.transformationGuestsTarget} tareas bloqueadas</strong> en el Wizard de todos los participantes.
                          Los primeros {Math.ceil(formData.transformationGuestsTarget / 2)} invitados deberán completarse antes de la mitad del ciclo.
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Área de Servicio Comunitario */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 sm:p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <label className="text-base font-semibold text-white flex items-center gap-2">
                        🤝 Servicio Comunitario
                      </label>
                      <p className="text-slate-400 text-sm mt-1">
                        Los participantes deberán definir acciones de servicio a su comunidad
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          forceCommunityServiceArea: !formData.forceCommunityServiceArea,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.forceCommunityServiceArea
                          ? 'bg-purple-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.forceCommunityServiceArea
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-slate-700 hover:bg-slate-600 text-white text-sm sm:text-base rounded-lg font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    creatingVision ||
                    !formData.nombre.trim() ||
                    !formData.startDate ||
                    !formData.endDate ||
                    !formData.maxParticipantes
                  }
                  className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm sm:text-base rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {creatingVision && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creatingVision ? 'Creando...' : 'Crear Visión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nueva Visión Básico (Vision Builder) */}
      {showBasicVisionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-blue-500/40 rounded-2xl sm:rounded-3xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl shadow-blue-500/20">
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-4 sm:p-8 border-b-2 border-white/10 relative overflow-hidden rounded-t-2xl sm:rounded-t-3xl">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-4xl shadow-xl">
                      🎯
                    </div>
                    <div>
                      <h2 className="text-4xl font-black text-white">Vision Builder</h2>
                      <p className="text-blue-100 font-medium">Nueva Generación</p>
                    </div>
                  </div>
                  <p className="text-blue-50/80 text-sm ml-[68px]">Configura fechas y staff para todos los entrenamientos</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBasicVisionModal(false)}
                  className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl transition-all hover:rotate-90 duration-300 flex items-center justify-center text-2xl font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
              <form onSubmit={handleCompleteVisionSubmit} className="p-6 space-y-8">
              
              {/* BLOQUE 1: Configuración General */}
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-blue-500/40 rounded-2xl p-8 shadow-xl hover:shadow-blue-500/20 hover:shadow-2xl transition-all hover:border-blue-400/60">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg hover:scale-110 transition-transform">
                    ⚙️
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                      Configuración General
                    </h3>
                    <p className="text-slate-400 text-sm">Información básica del programa</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-blue-300 mb-2 flex items-center gap-2">
                      <span>✏️</span>
                      Nombre de la Visión *
                    </label>
                    <input
                      type="text"
                      value={basicVisionData.nombre}
                      onChange={(e) => setBasicVisionData({...basicVisionData, nombre: e.target.value})}
                      placeholder="Ej: Generación 50"
                      className="w-full px-5 py-4 bg-slate-950/80 border-2 border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-blue-300 mb-2 flex items-center gap-2">
                      <span>🎨</span>
                      Color Identificador
                    </label>
                    <input
                      type="color"
                      value={basicVisionData.colorIdentificador}
                      onChange={(e) => setBasicVisionData({...basicVisionData, colorIdentificador: e.target.value})}
                      className="w-full h-[60px] bg-slate-950/80 border-2 border-slate-600 rounded-xl cursor-pointer hover:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* BLOQUE 2: Entrenamiento Básico */}
              <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-2 border-green-500/50 rounded-2xl p-8 shadow-xl hover:shadow-green-500/20 hover:shadow-2xl transition-all hover:border-green-400/70">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg hover:scale-110 transition-transform">
                    🌱
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                      Nivel 1: Básico (La Semilla)
                    </h3>
                    <p className="text-green-300/60 text-sm">Entrenamiento inicial del fin de semana</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Fecha Inicio</label>
                    <input
                      type="date"
                      value={basicVisionData.basicStartDate}
                      onChange={(e) => setBasicVisionData({...basicVisionData, basicStartDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Fecha Fin</label>
                    <input
                      type="date"
                      value={basicVisionData.basicEndDate}
                      onChange={(e) => setBasicVisionData({...basicVisionData, basicEndDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">👤 Coordinador</label>
                    <select
                      value={basicVisionData.basicCoordinatorId}
                      onChange={(e) => setBasicVisionData({...basicVisionData, basicCoordinatorId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    >
                      <option value="">Seleccionar coordinador básico...</option>
                      {coordinadores.filter(c => c.rol === 'COORDINATOR_BASIC' || c.rol === 'SCHOOL_ADMIN').map(coord => (
                        <option key={coord.id} value={coord.id}>{coord.nombre} {coord.rol === 'SCHOOL_ADMIN' ? '(Director)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">🎤 Entrenador</label>
                    <select
                      value={basicVisionData.basicTrainerId}
                      onChange={(e) => setBasicVisionData({...basicVisionData, basicTrainerId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    >
                      <option value="">Seleccionar entrenador...</option>
                      {trainers.map(trainer => (
                        <option key={trainer.id} value={trainer.id}>{trainer.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">📍 Ubicación (Opcional)</label>
                    <input
                      type="text"
                      value={basicVisionData.basicLocation}
                      onChange={(e) => setBasicVisionData({...basicVisionData, basicLocation: e.target.value})}
                      placeholder="Ej: Salón A, Hotel X"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">💰 Costo del Nivel Básico ({productPrices.currency})</label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={basicVisionData.basicCosto}
                      onChange={(e) => setBasicVisionData({...basicVisionData, basicCosto: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    />
                    <p className="text-slate-500 text-xs mt-1">¿Cuánto cobrarás por el entrenamiento básico?</p>
                  </div>
                </div>
              </div>

              {/* BLOQUE 3: Entrenamiento Avanzado */}
              <div className="bg-gradient-to-br from-orange-900/20 to-amber-900/20 border-2 border-orange-500/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                  💥 Nivel 2: Avanzado (El Quiebre)
                </h3>
                <p className="text-slate-400 text-sm mb-4">Entrenamiento de transformación profunda</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Fecha Inicio</label>
                    <input
                      type="date"
                      value={basicVisionData.advancedStartDate}
                      onChange={(e) => setBasicVisionData({...basicVisionData, advancedStartDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Fecha Fin</label>
                    <input
                      type="date"
                      value={basicVisionData.advancedEndDate}
                      onChange={(e) => setBasicVisionData({...basicVisionData, advancedEndDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">👤 Coordinador</label>
                    <select
                      value={basicVisionData.advancedCoordinatorId}
                      onChange={(e) => setBasicVisionData({...basicVisionData, advancedCoordinatorId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="">Seleccionar coordinador avanzado...</option>
                      {coordinadores.filter(c => c.rol === 'COORDINATOR_ADVANCED' || c.rol === 'SCHOOL_ADMIN').map(coord => (
                        <option key={coord.id} value={coord.id}>{coord.nombre} {coord.rol === 'SCHOOL_ADMIN' ? '(Director)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">🎤 Entrenador</label>
                    <select
                      value={basicVisionData.advancedTrainerId}
                      onChange={(e) => setBasicVisionData({...basicVisionData, advancedTrainerId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="">Seleccionar entrenador...</option>
                      {trainers.map(trainer => (
                        <option key={trainer.id} value={trainer.id}>{trainer.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">📍 Ubicación (Opcional)</label>
                    <input
                      type="text"
                      value={basicVisionData.advancedLocation}
                      onChange={(e) => setBasicVisionData({...basicVisionData, advancedLocation: e.target.value})}
                      placeholder="Ej: Salón A, Hotel X"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">💰 Costo del Nivel Avanzado ({productPrices.currency})</label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={basicVisionData.advancedCosto}
                      onChange={(e) => setBasicVisionData({...basicVisionData, advancedCosto: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                    <p className="text-slate-500 text-xs mt-1">¿Cuánto cobrarás por el entrenamiento avanzado?</p>
                  </div>
                </div>
              </div>

              {/* BLOQUE 4: Programa de Liderato */}
              <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-2 border-purple-500/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                  👑 Programa de Liderato (PL - El Viaje)
                </h3>
                <p className="text-slate-400 text-sm mb-4">Proceso de 3 meses con múltiples fines de semana</p>
                
                {/* Coordinador General PL y Costo */}
                <div className="mb-6 bg-slate-900/50 border border-purple-500/30 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">👤 Coordinador General PL</label>
                    <select
                      value={basicVisionData.plCoordinatorId}
                      onChange={(e) => setBasicVisionData({...basicVisionData, plCoordinatorId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Seleccionar coordinador...</option>
                      {coordinadores.filter(c => c.rol === 'COORDINADOR' || c.rol === 'SCHOOL_ADMIN').map(coord => (
                        <option key={coord.id} value={coord.id}>{coord.nombre} {coord.rol === 'SCHOOL_ADMIN' ? '(Director)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">💰 Costo del Programa de Liderato ({productPrices.currency})</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={basicVisionData.plCosto}
                      onChange={(e) => setBasicVisionData({...basicVisionData, plCosto: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-slate-500 text-xs mt-1">¿Cuánto cobrarás por el programa completo de liderato (3 meses)?</p>
                  </div>
                </div>

                {/* Lista de Fines de Semana */}
                <div className="space-y-4">
                  {basicVisionData.plWeekends.map((weekend, index) => (
                    <div key={weekend.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-white">{weekend.name}</h4>
                        {index >= 4 && (
                          <button
                            type="button"
                            onClick={() => removePLWeekend(weekend.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            ✕ Eliminar
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Fecha Inicio</label>
                          <input
                            type="date"
                            value={weekend.startDate}
                            onChange={(e) => updatePLWeekend(weekend.id, 'startDate', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Fecha Fin</label>
                          <input
                            type="date"
                            value={weekend.endDate}
                            onChange={(e) => updatePLWeekend(weekend.id, 'endDate', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">🎤 Entrenador</label>
                          <select
                            value={weekend.trainerId}
                            onChange={(e) => updatePLWeekend(weekend.id, 'trainerId', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                          >
                            <option value="">Seleccionar...</option>
                            {trainers.map(trainer => (
                              <option key={trainer.id} value={trainer.id}>{trainer.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">📍 Ubicación</label>
                          <input
                            type="text"
                            value={weekend.location}
                            onChange={(e) => updatePLWeekend(weekend.id, 'location', e.target.value)}
                            placeholder="Ej: Salón A"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botón Agregar Fin de Semana Extra */}
                <button
                  type="button"
                  onClick={addPLWeekend}
                  className="mt-4 w-full py-3 border-2 border-dashed border-purple-500/50 hover:border-purple-500 rounded-lg text-purple-400 hover:text-purple-300 font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Agregar Fin de Semana Extra
                </button>
              </div>

              {/* Resumen de Costos */}
              <div className="bg-gradient-to-r from-emerald-900/20 to-green-900/20 border-2 border-emerald-500/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  💵 Resumen de Inversión
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-slate-900/50 border border-emerald-500/20 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Nivel Básico</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {productPrices.currency === 'USD' ? 'USD ' : '$'}{basicVisionData.basicCosto.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 border border-emerald-500/20 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Nivel Avanzado</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {productPrices.currency === 'USD' ? 'USD ' : '$'}{basicVisionData.advancedCosto.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 border border-emerald-500/20 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Programa Liderato</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {productPrices.currency === 'USD' ? 'USD ' : '$'}{basicVisionData.plCosto.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-900/80 border-2 border-emerald-500/40 rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Inversión Total del Programa Completo</p>
                      <p className="text-slate-500 text-xs">Básico + Avanzado + Programa de Liderato</p>
                    </div>
                    <p className="text-4xl font-black text-emerald-400">
                      {productPrices.currency === 'USD' ? 'USD ' : '$'}{(basicVisionData.basicCosto + basicVisionData.advancedCosto + basicVisionData.plCosto).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 border-t-2 border-slate-700/50 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowBasicVisionModal(false)}
                  disabled={creatingVision}
                  className="flex-1 px-8 py-4 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>✕</span>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingVision}
                  className="flex-[2] px-10 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:via-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-black text-lg shadow-2xl hover:shadow-purple-500/50 hover:scale-105 disabled:hover:scale-100 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  {creatingVision ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Creando Visión...
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">🚀</span>
                      Crear Visión Completa
                    </>
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 border-2 border-emerald-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
            {/* Icono de éxito animado */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center animate-bounce">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-emerald-500/30 rounded-full animate-ping"></div>
              </div>
            </div>

            {/* Título */}
            <h3 className="text-3xl font-black text-center text-white mb-3">
              ¡Visión Creada!
            </h3>
            
            {/* Mensaje */}
            <p className="text-center text-slate-300 mb-6 text-lg">
              Tu visión completa ha sido creada exitosamente con todos los productos configurados.
            </p>

            {/* Detalles */}
            <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-emerald-500/20">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-2xl">📦</span>
                <div>
                  <p className="font-semibold text-white">3 Productos Creados</p>
                  <p className="text-xs text-slate-400">Básico • Avanzado • Liderato</p>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  window.location.reload();
                }}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  if (createdVisionId) {
                    window.location.href = `/dashboard/school-admin/vision/${createdVisionId}/manage`;
                  }
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-emerald-500/50"
              >
                Ver Visión →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Error */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-900 via-red-950/30 to-slate-900 border-2 border-red-500/40 rounded-2xl w-full max-w-md shadow-2xl shadow-red-500/20 animate-in zoom-in-95 duration-300">
            {/* Header con gradiente rojo */}
            <div className="bg-gradient-to-r from-red-600 via-red-500 to-orange-600 p-6 rounded-t-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-20"></div>
              <div className="relative flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-1">
                    Error al Crear Visión
                  </h3>
                  <p className="text-red-100 text-sm">
                    No se pudo completar la operación
                  </p>
                </div>
              </div>
            </div>

            {/* Contenido del error */}
            <div className="p-6 space-y-6">
              {/* Mensaje de error */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-200 text-sm leading-relaxed">
                  {errorMessage}
                </p>
              </div>

              {/* Sugerencias */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
                <h4 className="text-white font-semibold text-sm mb-2">💡 Verifica lo siguiente:</h4>
                <ul className="space-y-1.5 text-slate-300 text-xs">
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5">•</span>
                    <span>Todos los campos obligatorios están completos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5">•</span>
                    <span>Las fechas son válidas y están en orden correcto</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5">•</span>
                    <span>Los coordinadores y trainers están asignados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5">•</span>
                    <span>Tu conexión a internet es estable</span>
                  </li>
                </ul>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setShowErrorModal(false);
                    // El modal de Vision Builder permanece abierto para que puedan corregir
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-red-500/50"
                >
                  Intentar de Nuevo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
