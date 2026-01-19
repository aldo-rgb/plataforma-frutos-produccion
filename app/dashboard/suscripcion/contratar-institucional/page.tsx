'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Upload, MapPin, Users, DollarSign, CreditCard, Loader2, ArrowLeft, CheckCircle2, Ticket, Navigation, Target } from 'lucide-react';
import Image from 'next/image';

const MINIMO_LICENCIAS = 100;

type PaymentMethod = 'stripe' | 'paypal' | 'mercadopago';

export default function ContratarInstitucionalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [loadingPrecios, setLoadingPrecios] = useState(true);
  const [error, setError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{ licencias: number } | null>(null);
  
  // Precios dinámicos
  const [precioBasePorLicencia, setPrecioBasePorLicencia] = useState(150);
  const [moneda, setMoneda] = useState<'MXN' | 'USD'>('USD');
  
  // Form data
  const [nombreOrganizacion, setNombreOrganizacion] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [geofencing, setGeofencing] = useState('');
  const [geofencingEnabled, setGeofencingEnabled] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [geofenceRadius, setGeofenceRadius] = useState('50');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [cantidadLicencias, setCantidadLicencias] = useState(MINIMO_LICENCIAS);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'codigo'>('stripe');
  const [codigo, setCodigo] = useState('');
  const [masterOrganizations, setMasterOrganizations] = useState<any[]>([]);
  const [selectedMasterOrg, setSelectedMasterOrg] = useState<string>('');
  const [searchMasterOrg, setSearchMasterOrg] = useState('');
  const [showMasterOrgDropdown, setShowMasterOrgDropdown] = useState(false);
  const [belongsToMaster, setBelongsToMaster] = useState<'yes' | 'no' | ''>('');

  // Cargar precios desde API público
  useEffect(() => {
    const cargarPrecios = async () => {
      try {
        const res = await fetch('/api/precios/institucional');
        if (res.ok) {
          const precios = await res.json();
          
          // Detectar moneda basada en geolocalización
          let detectedMoneda: 'MXN' | 'USD' = 'MXN'; // Por defecto MXN (México)
          
          try {
            // Intentar detectar por timezone
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (timezone && (timezone.includes('America/Mexico') || timezone.includes('America/Monterrey') || timezone.includes('America/Cancun') || timezone.includes('America/Tijuana'))) {
              detectedMoneda = 'MXN';
            } else if (timezone && !timezone.includes('America/')) {
              detectedMoneda = 'USD';
            }
          } catch (e) {
            console.log('No se pudo detectar timezone, usando MXN por defecto');
          }
          
          setMoneda(detectedMoneda);
          
          const precioLicencia = detectedMoneda === 'MXN' 
            ? precios.institucional.mxn.licencia 
            : precios.institucional.usd.licencia;
          
          setPrecioBasePorLicencia(precioLicencia);
          
          console.log('Precios cargados:', {
            moneda: detectedMoneda,
            precioLicencia,
            preciosCompletos: precios.institucional
          });
        } else {
          console.error('Error al cargar precios, status:', res.status);
        }
      } catch (err) {
        console.error('Error cargando precios:', err);
      } finally {
        setLoadingPrecios(false);
      }
    };
    
    cargarPrecios();
  }, []);

  // Cargar organizaciones master disponibles
  useEffect(() => {
    const cargarMasterOrgs = async () => {
      try {
        const res = await fetch('/api/master-organizations/public');
        if (res.ok) {
          const data = await res.json();
          console.log('Master Organizations cargadas:', data);
          setMasterOrganizations(data);
        } else {
          console.error('Error al cargar master orgs, status:', res.status);
        }
      } catch (err) {
        console.error('Error cargando organizaciones master:', err);
      }
    };
    
    cargarMasterOrgs();
  }, []);

  // Cálculos
  const totalAnual = cantidadLicencias * precioBasePorLicencia;

  // Detectar ubicación GPS
  const detectarUbicacion = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setGeofencingEnabled(true);
        setDetectingLocation(false);
        
        // Obtener nombre de ubicación usando reverse geocoding
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`)
          .then(res => res.json())
          .then(data => {
            if (data.display_name) {
              setGeofencing(data.display_name);
            }
          })
          .catch(() => {
            setGeofencing(`${position.coords.latitude}, ${position.coords.longitude}`);
          });
      },
      (error) => {
        setDetectingLocation(false);
        alert('No se pudo obtener tu ubicación. Por favor ingresa las coordenadas manualmente.');
        console.error('Error de geolocalización:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Función separada para procesar el archivo
  const processFile = async (file: File) => {
    console.log('📄 Processing file:', file.name, file.type, file.size);
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/') && !file.type.includes('image')) {
      console.log('❌ Invalid file type:', file.type);
      setError('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.log('❌ File too large:', file.size);
      setError('La imagen no debe superar los 5MB');
      return;
    }

    console.log('✅ File validation passed, starting upload...');
    setLogoFile(file);
    setUploadingLogo(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'organizations');

      console.log('📤 Sending to /api/upload...');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('📥 Response status:', res.status);
      const data = await res.json();
      console.log('📥 Response data:', data);

      if (data.success) {
        console.log('✅ Upload successful:', data.url);
        setLogoUrl(data.url);
      } else {
        console.log('❌ Upload failed:', data.error);
        setError(data.error || 'Error al subir el logo');
      }
    } catch (err) {
      console.error('❌ Error uploading logo:', err);
      setError('Error al subir el logo');
    } finally {
      setUploadingLogo(false);
      // Reset input para permitir seleccionar el mismo archivo de nuevo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🖼️ handleLogoUpload triggered, files:', e.target.files?.length);
    const file = e.target.files?.[0];
    
    if (!file) {
      console.log('❌ No file in event');
      return;
    }

    await processFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validaciones
    if (!nombreOrganizacion.trim()) {
      setError('El nombre de la organización es obligatorio');
      setLoading(false);
      return;
    }

    if (cantidadLicencias < MINIMO_LICENCIAS) {
      setError(`La cantidad mínima de licencias es ${MINIMO_LICENCIAS}`);
      setLoading(false);
      return;
    }

    // Si seleccionó "Tengo un código", validar y canjear
    if (paymentMethod === 'codigo') {
      if (!codigo.trim()) {
        setError('Por favor ingresa un código');
        setLoading(false);
        return;
      }

      try {
        const geofencingData = geofencingEnabled && latitude && longitude ? {
          name: geofencing.trim() || 'Ubicación principal',
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: parseInt(geofenceRadius) || 50
        } : null;

        const res = await fetch('/api/codigos/canjear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            codigo: codigo.trim(),
            nombreOrganizacion,
            address: address.trim(),
            logoUrl,
            geofencing: geofencingData ? JSON.stringify(geofencingData) : null,
            masterOrganizationId: selectedMasterOrg ? parseInt(selectedMasterOrg) : null
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          setSuccessData({ licencias: data.licenciasAsignadas || data.cantidadLicencias || 50 });
          setShowSuccessModal(true);
          setLoading(false);
        } else {
          const errorData = await res.json();
          setError(errorData.error || 'Código inválido o ya utilizado');
          setLoading(false);
        }
      } catch (err) {
        setError('Error al validar el código. Intenta nuevamente.');
        setLoading(false);
      }
      return;
    }

    // Flujo normal de pago
    try {
      const geofencingData = geofencingEnabled && latitude && longitude ? {
        name: geofencing.trim() || 'Ubicación principal',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseInt(geofenceRadius) || 50
      } : null;
      // Crear orden de pago
      const res = await fetch('/api/pagos/institucional/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreOrganizacion,
          address: address.trim(),
          logoUrl,
          geofencing: geofencingData ? JSON.stringify(geofencingData) : null,
          cantidadLicencias,
          paymentMethod,
          totalAmount: totalAnual
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Redirigir a la URL de pago (simulada o real)
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        }
      } else {
        setError(data.error || 'Error al procesar el pago');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('Error al procesar el pago. Por favor intenta de nuevo.');
      setLoading(false);
    }
  };

  if (status === 'loading' || loadingPrecios) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          <p className="text-gray-500 text-sm">Cargando información...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modal de éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 border border-purple-500/30 rounded-3xl p-8 shadow-2xl">
            {/* Efectos de fondo */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-3xl" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
            
            {/* Contenido */}
            <div className="relative">
              {/* Ícono de éxito */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={2.5} />
                  </div>
                </div>
              </div>

              {/* Título */}
              <h3 className="text-2xl font-bold text-center text-white mb-2">
                ¡Código Canjeado!
              </h3>
              
              {/* Descripción */}
              <p className="text-center text-gray-400 mb-6">
                Tu código institucional ha sido activado exitosamente. Serás redirigido para iniciar sesión nuevamente.
              </p>

              {/* Info de licencias */}
              <div className="bg-black/30 border border-purple-500/20 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Licencias asignadas</span>
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  {successData?.licencias || 0}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Usuarios con acceso completo a la plataforma
                </p>
              </div>

              {/* Botón de continuar */}
              <button
                onClick={async () => {
                  setShowSuccessModal(false);
                  // Cerrar sesión para que el usuario inicie de nuevo con el rol actualizado
                  await signOut({ callbackUrl: '/login?message=Inicia sesión nuevamente como Director' });
                }}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
              >
                <span>Continuar</span>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>

              {/* Mensaje adicional */}
              <p className="text-center text-xs text-gray-600 mt-4">
                Ahora eres Director de tu organización
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[#0A0A0A] py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header minimalista */}
        <div className="mb-12">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <h1 className="text-4xl font-light text-white mb-3 tracking-tight">Contratar Plan Institucional</h1>
          <p className="text-gray-500 text-sm">Configura tu organización y completa el pago para activar tu plan</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Card principal con diseño moderno */}
          <div className="bg-gradient-to-br from-gray-900/40 to-gray-900/20 backdrop-blur-xl rounded-3xl p-8 border border-white/5 shadow-2xl">
            
            {/* Información de la Organización */}
            <div className="mb-10">
              <h2 className="text-xl font-light text-white mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-purple-500/20">
                  <Building2 className="w-4 h-4 text-purple-400" />
                </div>
                Información de la Organización
              </h2>
              
              <div className="space-y-6">
                {/* Pregunta inicial: ¿Pertenece a alguna agrupación? */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">
                    ¿Tu organización pertenece a algún Centro o Movimiento?
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setBelongsToMaster('yes');
                        setSelectedMasterOrg('');
                        setSearchMasterOrg('');
                      }}
                      className={`flex-1 px-5 py-4 rounded-2xl border transition-all ${
                        belongsToMaster === 'yes'
                          ? 'bg-purple-500/20 border-purple-500/50 text-white'
                          : 'bg-black/40 border-white/10 text-gray-400 hover:border-purple-500/30'
                      }`}
                    >
                      Sí, pertenece
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBelongsToMaster('no');
                        setSelectedMasterOrg('');
                        setSearchMasterOrg('');
                      }}
                      className={`flex-1 px-5 py-4 rounded-2xl border transition-all ${
                        belongsToMaster === 'no'
                          ? 'bg-purple-500/20 border-purple-500/50 text-white'
                          : 'bg-black/40 border-white/10 text-gray-400 hover:border-purple-500/30'
                      }`}
                    >
                      No, es independiente
                    </button>
                  </div>
                </div>

                {/* Buscador de Agrupación (solo si responde "Sí") */}
                {belongsToMaster === 'yes' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">
                      Busca tu Centro o Movimiento
                    </label>
                    {masterOrganizations.length === 0 ? (
                      <div className="px-5 py-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-400 text-sm">
                        ⚠️ No hay agrupaciones disponibles en este momento. Tu organización será creada como independiente.
                      </div>
                    ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={searchMasterOrg}
                        onChange={(e) => {
                          setSearchMasterOrg(e.target.value);
                          setShowMasterOrgDropdown(true);
                        }}
                        onFocus={() => setShowMasterOrgDropdown(true)}
                        className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-black/60 transition-all"
                        placeholder="Escribe para buscar (ej: Frutos, Impacto, Monterrey...)"
                      />
                      
                      {/* Dropdown de resultados */}
                      {showMasterOrgDropdown && searchMasterOrg && (
                        <div className="absolute z-50 w-full mt-2 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                          {masterOrganizations
                            .filter((mo) =>
                              mo.name.toLowerCase().includes(searchMasterOrg.toLowerCase())
                            )
                            .map((mo) => (
                              <button
                                key={mo.id}
                                type="button"
                                onClick={() => {
                                  setSelectedMasterOrg(mo.id.toString());
                                  setSearchMasterOrg(mo.name);
                                  setShowMasterOrgDropdown(false);
                                }}
                                className={`w-full px-5 py-3 text-left hover:bg-purple-500/20 transition-colors border-b border-white/5 last:border-b-0 ${
                                  selectedMasterOrg === mo.id.toString()
                                    ? 'bg-purple-500/20 text-white'
                                    : 'text-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {mo.logoUrl && (
                                    <Image
                                      src={mo.logoUrl}
                                      alt={mo.name}
                                      width={32}
                                      height={32}
                                      className="w-8 h-8 rounded-lg object-cover"
                                    />
                                  )}
                                  <div>
                                    <div className="font-medium">{mo.name}</div>
                                    {mo.description && (
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        {mo.description}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-600 mt-1">
                                      {mo.organizationCount} organizaciones
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          
                          {masterOrganizations.filter((mo) =>
                            mo.name.toLowerCase().includes(searchMasterOrg.toLowerCase())
                          ).length === 0 && (
                            <div className="px-5 py-4 text-center text-gray-500">
                              No se encontraron resultados para "{searchMasterOrg}"
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Agrupación seleccionada */}
                      {selectedMasterOrg && !showMasterOrgDropdown && (
                        <div className="mt-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {masterOrganizations.find(mo => mo.id.toString() === selectedMasterOrg)?.logoUrl && (
                                <Image
                                  src={masterOrganizations.find(mo => mo.id.toString() === selectedMasterOrg)?.logoUrl || ''}
                                  alt="Logo"
                                  width={40}
                                  height={40}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                              )}
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {masterOrganizations.find(mo => mo.id.toString() === selectedMasterOrg)?.name}
                                </div>
                                <div className="text-xs text-gray-400">Agrupación seleccionada</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMasterOrg('');
                                setSearchMasterOrg('');
                              }}
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      Escribe para buscar tu centro educativo o movimiento
                    </p>
                  </div>
                )}
                
                {/* Nombre de la Organización */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">
                    Nombre de la Organización
                  </label>
                  <input
                    type="text"
                    value={nombreOrganizacion}
                    onChange={(e) => setNombreOrganizacion(e.target.value)}
                    className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-black/60 transition-all"
                    placeholder="Ej: Centro Educativo Quantum"
                    required
                  />
                </div>

                {/* Dirección de la Organización */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-400" />
                    Dirección de la Sede
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-black/60 transition-all"
                    placeholder="Ej: Av. Constitución 2828 Pte., Obispado, 64060 Monterrey, N.L."
                    required
                  />
                  <p className="mt-2 text-xs text-gray-600">Dirección completa donde se realizarán los entrenamientos</p>
                </div>

                {/* Logo de la Organización */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">
                    Logo de la Organización
                  </label>
                  <div className="flex items-center gap-4">
                    {logoUrl && (
                      <div className="w-24 h-24 rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-lg">
                        <Image src={logoUrl} alt="Logo" width={96} height={96} className="object-cover w-full h-full" />
                      </div>
                    )}
                    <div className="flex-1">
                      {uploadingLogo ? (
                        <div className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-gray-400 flex items-center justify-center gap-3 min-h-[56px]">
                          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                          <span className="text-sm">Subiendo...</span>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                processFile(file);
                              }
                            }}
                            className="hidden"
                            id="logo-file-upload"
                          />
                          <label
                            htmlFor="logo-file-upload"
                            className="flex items-center justify-center gap-3 w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-gray-400 hover:border-purple-500/50 hover:bg-black/60 active:border-purple-500 active:bg-black/60 transition-all min-h-[56px] cursor-pointer"
                          >
                            <Upload className="w-5 h-5 text-purple-400" />
                            <span className="text-sm">{logoUrl ? 'Cambiar Logo' : 'Subir Logo'}</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">Formatos: JPG, PNG. Máximo 5MB</p>
                </div>

                {/* Geofencing (Opcional) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Geofencing <span className="text-gray-600">(Sistema Tap)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setGeofencingEnabled(!geofencingEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        geofencingEnabled ? 'bg-purple-600' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          geofencingEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {geofencingEnabled && (
                    <div className="space-y-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                      {/* Botón de detección automática */}
                      <button
                        type="button"
                        onClick={detectarUbicacion}
                        disabled={detectingLocation}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all"
                      >
                        {detectingLocation ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Detectando ubicación...</span>
                          </>
                        ) : (
                          <>
                            <Navigation className="w-4 h-4" />
                            <span>Detectar mi ubicación</span>
                          </>
                        )}
                      </button>

                      {/* Nombre de ubicación */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">
                          Nombre de ubicación
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                          <input
                            type="text"
                            value={geofencing}
                            onChange={(e) => setGeofencing(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 text-sm"
                            placeholder="Ej: Campus Monterrey, Edificio A"
                          />
                        </div>
                      </div>

                      {/* Coordenadas GPS */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-2">
                            Latitud
                          </label>
                          <input
                            type="text"
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value)}
                            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 text-sm font-mono"
                            placeholder="25.651070"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-2">
                            Longitud
                          </label>
                          <input
                            type="text"
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value)}
                            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 text-sm font-mono"
                            placeholder="-100.289900"
                          />
                        </div>
                      </div>

                      {/* Radio de cobertura */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">
                          Radio de cobertura (metros)
                        </label>
                        <div className="relative">
                          <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                          <input
                            type="number"
                            value={geofenceRadius}
                            onChange={(e) => setGeofenceRadius(e.target.value)}
                            min="10"
                            max="1000"
                            step="10"
                            className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 text-sm"
                            placeholder="50"
                          />
                        </div>
                        <p className="mt-2 text-xs text-gray-600">
                          Define el área donde los usuarios podrán registrar asistencia (10-1000m)
                        </p>
                      </div>

                      {/* Preview de coordenadas */}
                      {latitude && longitude && (
                        <div className="p-3 bg-black/20 border border-white/5 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Vista previa:</p>
                          <p className="text-xs text-purple-400 font-mono break-all">
                            {latitude}, {longitude} (±{geofenceRadius}m)
                          </p>
                          <a
                            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 underline mt-1 inline-block"
                          >
                            Ver en Google Maps ↗
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {!geofencingEnabled && (
                    <p className="text-xs text-gray-600">
                      Activa el geofencing para restringir el acceso basado en ubicación GPS
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Licencias y Precio */}
            <div className="mb-10">
              <h2 className="text-xl font-light text-white mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-500/20">
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                Licencias
              </h2>
              
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">
                  Cantidad de Licencias <span className="text-gray-600">(Mínimo {MINIMO_LICENCIAS})</span>
                </label>
                <input
                  type="number"
                  min={MINIMO_LICENCIAS}
                  step="1"
                  value={cantidadLicencias}
                  onChange={(e) => setCantidadLicencias(Math.max(MINIMO_LICENCIAS, parseInt(e.target.value) || MINIMO_LICENCIAS))}
                  className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-black/60 transition-all text-lg font-light"
                  required
                />
                <p className="mt-3 text-sm text-gray-500">
                  Precio por licencia: <span className="text-white font-medium">{moneda === 'MXN' ? '$' : 'US$'}{precioBasePorLicencia.toLocaleString()} {moneda}</span>
                </p>
              </div>

              {/* Total con diseño destacado */}
              <div className="mt-8 p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-3xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Total Anual</span>
                  <span className="text-4xl font-light text-white tracking-tight">{moneda === 'MXN' ? '$' : 'US$'}{totalAnual.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-end">
                  <span className="text-xs text-gray-500">
                    {cantidadLicencias} licencias × {moneda === 'MXN' ? '$' : 'US$'}{precioBasePorLicencia.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="mb-10">
              <h2 className="text-xl font-light text-white mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-green-500/20">
                  <CreditCard className="w-4 h-4 text-green-400" />
                </div>
                Método de Pago
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Stripe */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('stripe')}
                  className={`group relative p-6 rounded-2xl border transition-all ${
                    paymentMethod === 'stripe'
                      ? 'border-purple-500/50 bg-purple-500/5 shadow-lg shadow-purple-500/10'
                      : 'border-white/5 bg-black/20 hover:border-white/10 hover:bg-black/40'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${
                      paymentMethod === 'stripe'
                        ? 'bg-purple-500/20'
                        : 'bg-white/5 group-hover:bg-white/10'
                    }`}>
                      <CreditCard className={`w-6 h-6 ${paymentMethod === 'stripe' ? 'text-purple-400' : 'text-gray-500'}`} />
                    </div>
                    <p className="text-white font-medium text-sm mb-1">Stripe</p>
                    <p className="text-gray-600 text-xs">Tarjeta de crédito/débito</p>
                  </div>
                  {paymentMethod === 'stripe' && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="w-5 h-5 text-purple-400" />
                    </div>
                  )}
                </button>

                {/* PayPal */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('paypal')}
                  className={`group relative p-6 rounded-2xl border transition-all ${
                    paymentMethod === 'paypal'
                      ? 'border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/10'
                      : 'border-white/5 bg-black/20 hover:border-white/10 hover:bg-black/40'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${
                      paymentMethod === 'paypal'
                        ? 'bg-blue-500/20'
                        : 'bg-white/5 group-hover:bg-white/10'
                    }`}>
                      <DollarSign className={`w-6 h-6 ${paymentMethod === 'paypal' ? 'text-blue-400' : 'text-gray-500'}`} />
                    </div>
                    <p className="text-white font-medium text-sm mb-1">PayPal</p>
                    <p className="text-gray-600 text-xs">Cuenta PayPal</p>
                  </div>
                  {paymentMethod === 'paypal' && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-400" />
                    </div>
                  )}
                </button>

                {/* Mercado Pago */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mercadopago')}
                  className={`group relative p-6 rounded-2xl border transition-all ${
                    paymentMethod === 'mercadopago'
                      ? 'border-cyan-500/50 bg-cyan-500/5 shadow-lg shadow-cyan-500/10'
                      : 'border-white/5 bg-black/20 hover:border-white/10 hover:bg-black/40'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${
                      paymentMethod === 'mercadopago'
                        ? 'bg-cyan-500/20'
                        : 'bg-white/5 group-hover:bg-white/10'
                    }`}>
                      <CreditCard className={`w-6 h-6 ${paymentMethod === 'mercadopago' ? 'text-cyan-400' : 'text-gray-500'}`} />
                    </div>
                    <p className="text-white font-medium text-sm mb-1">Mercado Pago</p>
                    <p className="text-gray-600 text-xs">Múltiples métodos</p>
                  </div>
                  {paymentMethod === 'mercadopago' && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                    </div>
                  )}
                </button>

                {/* Tengo un Código */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('codigo')}
                  className={`group relative p-6 rounded-2xl border transition-all ${
                    paymentMethod === 'codigo'
                      ? 'border-yellow-500/50 bg-yellow-500/5 shadow-lg shadow-yellow-500/10'
                      : 'border-white/5 bg-black/20 hover:border-white/10 hover:bg-black/40'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${
                      paymentMethod === 'codigo'
                        ? 'bg-yellow-500/20'
                        : 'bg-white/5 group-hover:bg-white/10'
                    }`}>
                      <Ticket className={`w-6 h-6 ${paymentMethod === 'codigo' ? 'text-yellow-400' : 'text-gray-500'}`} />
                    </div>
                    <p className="text-white font-medium text-sm mb-1">Tengo un Código</p>
                    <p className="text-gray-600 text-xs">Código de licencia</p>
                  </div>
                  {paymentMethod === 'codigo' && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="w-5 h-5 text-yellow-400" />
                    </div>
                  )}
                </button>
              </div>

              {/* Input de Código cuando está seleccionado */}
              {paymentMethod === 'codigo' && (
                <div className="mt-6 p-6 bg-gradient-to-br from-yellow-900/20 to-orange-900/20 backdrop-blur-xl rounded-2xl border border-yellow-500/20">
                  <label className="block text-sm font-medium text-yellow-300 mb-3">
                    Código de Licencia Institucional
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                      placeholder="INST-XXXXXX"
                      className="flex-1 px-4 py-3 bg-black/40 border border-yellow-500/30 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 focus:bg-black/60 transition-all font-mono tracking-wider"
                    />
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    Ingresa tu código de licencia institucional para activar tu plan sin pago.
                  </p>
                </div>
              )}
            </div>

            {/* Beneficios incluidos */}
            <div className="mb-10 p-6 bg-gradient-to-br from-gray-900/40 to-black/40 rounded-3xl border border-white/5">
              <h3 className="text-lg font-light text-white mb-5">Plan Incluye</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  'Mentor asignado por estudiante',
                  'Mentor Quantum AI',
                  'Retroalimentación personalizada',
                  'Monitor de progreso global',
                  'Gestión de licencias activa',
                  'Reportes de comunidad',
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 text-gray-300">
                    <div className="w-5 h-5 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    </div>
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={loading || uploadingLogo}
              className="w-full py-5 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-500 hover:via-purple-400 hover:to-blue-500 disabled:from-gray-800 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-2xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 flex items-center justify-center gap-3 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : paymentMethod === 'codigo' ? (
                <>
                  <Ticket className="w-5 h-5" />
                  <span>Canjear Código</span>
                </>
              ) : (
                <>
                  <span>Proceder al Pago</span>
                  <span className="font-light">·</span>
                  <span className="font-semibold">{moneda === 'MXN' ? '$' : 'US$'}{totalAnual.toLocaleString()}</span>
                </>
              )}
            </button>

            <p className="mt-4 text-center text-xs text-gray-600">
              {paymentMethod === 'codigo' 
                ? 'Al canjear el código, aceptas nuestros términos y condiciones'
                : 'Al proceder con el pago, aceptas nuestros términos y condiciones'
              }
            </p>
          </div>
        </form>
      </div>
      </div>
    </>
  );
}
