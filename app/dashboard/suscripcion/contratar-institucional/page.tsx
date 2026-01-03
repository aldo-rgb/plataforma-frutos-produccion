'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Upload, MapPin, Users, DollarSign, CreditCard, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
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
  
  // Precios dinámicos
  const [precioBasePorLicencia, setPrecioBasePorLicencia] = useState(150);
  const [moneda, setMoneda] = useState<'MXN' | 'USD'>('USD');
  
  // Form data
  const [nombreOrganizacion, setNombreOrganizacion] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [geofencing, setGeofencing] = useState('');
  const [cantidadLicencias, setCantidadLicencias] = useState(MINIMO_LICENCIAS);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe');

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

  // Cálculos
  const totalAnual = cantidadLicencias * precioBasePorLicencia;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5MB');
      return;
    }

    setLogoFile(file);
    setUploadingLogo(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'organizations');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setLogoUrl(data.url);
      } else {
        setError(data.error || 'Error al subir el logo');
      }
    } catch (err) {
      console.error('Error uploading logo:', err);
      setError('Error al subir el logo');
    } finally {
      setUploadingLogo(false);
    }
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

    try {
      // Crear orden de pago
      const res = await fetch('/api/pagos/institucional/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreOrganizacion,
          logoUrl,
          geofencing: geofencing.trim() || null,
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
    <div lassName="min-h-screen bg-[#0A0A0A] py-12 px-4">
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
                    <label className="flex-1 cursor-pointer group">
                      <div className="px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-gray-400 group-hover:border-purple-500/50 group-hover:bg-black/60 transition-all flex items-center justify-center gap-3">
                        {uploadingLogo ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                            <span className="text-sm">Subiendo...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-purple-400" />
                            <span className="text-sm">{logoUrl ? 'Cambiar Logo' : 'Subir Logo'}</span>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={uploadingLogo}
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">Formatos: JPG, PNG. Máximo 5MB</p>
                </div>

                {/* Geofencing (Opcional) */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">
                    Geofencing <span className="text-gray-600">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                    <input
                      type="text"
                      value={geofencing}
                      onChange={(e) => setGeofencing(e.target.value)}
                      className="w-full pl-14 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-black/60 transition-all"
                      placeholder="Ej: Ciudad de México, México"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-600">Ubicación geográfica para restricciones opcionales</p>
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>
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
              ) : (
                <>
                  <span>Proceder al Pago</span>
                  <span className="font-light">·</span>
                  <span className="font-semibold">{moneda === 'MXN' ? '$' : 'US$'}{totalAnual.toLocaleString()}</span>
                </>
              )}
            </button>

            <p className="mt-4 text-center text-xs text-gray-600">
              Al proceder con el pago, aceptas nuestros términos y condiciones
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
