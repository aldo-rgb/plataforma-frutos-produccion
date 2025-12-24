'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Shield,
  Users,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Package,
  TrendingDown,
  Zap,
  Award,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

// ===== CONFIGURACIÓN DEL MOTOR DE PRECIOS DINÁMICOS =====
const MAX_DISCOUNT = 0.15; // 15% descuento máximo
const DISCOUNT_VOLUME_TARGET = 1000; // Volumen para descuento máximo
const MIN_LICENSES = 20; // Mínimo de licencias

// Paquetes predefinidos para mostrar
const PACKAGE_PRESETS = [
  { quantity: 20, name: 'Starter', badge: null },
  { quantity: 50, name: 'Clase', badge: null },
  { quantity: 100, name: 'Generación', badge: '⚡ Base' },
  { quantity: 250, name: 'Campus', badge: '💰 Buen Ahorro' },
  { quantity: 500, name: 'Facultad', badge: '🔥 Gran Ahorro' },
  { quantity: 1000, name: 'Campus Full', badge: '🎯 Máximo Ahorro' },
];

// ===== MOTOR DE CÁLCULO DE PRECIOS =====
function calculateDynamicPrice(quantity: number, basePriceAt100: number) {
  let unitPrice: number;
  let discountPercentage = 0;
  let zone: 'premium' | 'base' | 'discount' = 'base';

  if (quantity < 100) {
    // ZONA PREMIUM: 20 licencias = +15%, luego se reduce hasta 100
    // Interpolación: de 15% en cantidad=20 hasta 0% en cantidad=100
    const premiumRate = 0.15 - ((quantity - MIN_LICENSES) / (100 - MIN_LICENSES)) * 0.15;
    unitPrice = basePriceAt100 * (1 + premiumRate);
    zone = 'premium';
  } else if (quantity === 100) {
    // ZONA BASE (PIVOTE)
    unitPrice = basePriceAt100;
    zone = 'base';
  } else {
    // ZONA DESCUENTO: Interpolación lineal hasta 1000
    const progress = (quantity - 100) / (DISCOUNT_VOLUME_TARGET - 100);
    const effectiveProgress = Math.min(progress, 1);
    discountPercentage = effectiveProgress * MAX_DISCOUNT;
    unitPrice = basePriceAt100 * (1 - discountPercentage);
    zone = 'discount';
  }

  const totalPrice = unitPrice * quantity;
  const baseTotalPrice = basePriceAt100 * quantity;
  const savings = baseTotalPrice - totalPrice;

  return {
    unitPrice: Math.round(unitPrice),
    totalPrice: Math.round(totalPrice),
    discountPercentage: Math.round(discountPercentage * 100),
    savings: Math.round(savings),
    zone,
  };
}

export default function RequestLicensesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
  const [basePriceAt100, setBasePriceAt100] = useState<number>(150); // Precio base dinámico
  const [quantity, setQuantity] = useState(100);
  const [processing, setProcessing] = useState(false);

  // Calcular precio dinámico
  const pricing = calculateDynamicPrice(quantity, basePriceAt100);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'SCHOOL_ADMIN') {
      router.push('/dashboard');
    } else {
      fetchOrganization();
    }
  }, [status, session]);

  const fetchOrganization = async () => {
    try {
      const res = await fetch('/api/school-admin/dashboard');
      const result = await res.json();

      if (result.success) {
        setOrganization(result.organization);
        
        // Obtener el precio base desde SchoolCredit de la organización
        const creditRes = await fetch(`/api/school-admin/pricing?organizationId=${result.organization.id}`);
        const creditResult = await creditRes.json();
        
        if (creditResult.success && creditResult.basePrice) {
          setBasePriceAt100(creditResult.basePrice);
        }
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLicenses = async () => {
    if (quantity < MIN_LICENSES) {
      alert(`La cantidad mínima es ${MIN_LICENSES} licencias`);
      return;
    }

    if (!organization?.id) {
      alert('Error: No se pudo obtener la información de la organización');
      return;
    }

    setProcessing(true);

    try {
      console.log('📤 Enviando orden:', {
        quantity,
        unitPrice: pricing.unitPrice,
        totalAmount: pricing.totalPrice,
        organizationId: organization.id,
      });

      const res = await fetch('/api/school-admin/licenses/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity,
          unitPrice: pricing.unitPrice,
          totalAmount: pricing.totalPrice,
          organizationId: organization.id,
        }),
      });

      const result = await res.json();
      console.log('📥 Respuesta:', result);

      if (result.success) {
        // Redirigir a la página de pago
        router.push('/dashboard/school-admin/licenses/payment');
      } else {
        alert(result.error || 'Error al crear la orden');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error de conexión');
    } finally {
      setProcessing(false);
    }
  };

  const getProgressToNextDiscount = () => {
    if (quantity >= 1000) return 100;
    if (quantity < 100) {
      return ((quantity / 100) * 100);
    }
    return (((quantity - 100) / (1000 - 100)) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={48} />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-6">
        <div className="text-center text-white">
          <p>No se encontró la organización</p>
          <button
            onClick={() => router.push('/dashboard/school-admin')}
            className="mt-4 px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/school-admin')}
            className="flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors mb-6"
          >
            <ArrowLeft size={20} />
            <span>Volver al Dashboard</span>
          </button>

          <div className="flex items-center gap-4 mb-2">
            {organization.logoUrl ? (
              <img
                src={organization.logoUrl}
                alt={organization.name}
                className="w-16 h-16 rounded-xl object-cover ring-2 ring-purple-500/30"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
                style={{ backgroundColor: organization.brandColor || '#8B5CF6' }}
              >
                {organization.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                Comprar Licencias
                <Sparkles className="text-yellow-400" size={28} />
              </h1>
              <p className="text-slate-400">{organization.name}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda: Paquetes Predefinidos */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/50 backdrop-blur border border-purple-500/20 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Package className="text-purple-400" />
                Paquetes Disponibles
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Selecciona un paquete o ingresa una cantidad personalizada
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {PACKAGE_PRESETS.map((preset) => {
                  const presetPricing = calculateDynamicPrice(preset.quantity, basePriceAt100);
                  const isSelected = quantity === preset.quantity;

                  return (
                    <button
                      key={preset.quantity}
                      onClick={() => setQuantity(preset.quantity)}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/50'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      {preset.badge && (
                        <div className="absolute -top-2 -right-2 px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                          {preset.badge}
                        </div>
                      )}
                      
                      <div className="text-slate-400 text-xs mb-1">{preset.name}</div>
                      <div className="text-white font-bold text-2xl mb-1">
                        {preset.quantity}
                      </div>
                      <div className="text-green-400 font-semibold text-sm mb-1">
                        ${presetPricing.unitPrice} MXN/u
                      </div>
                      <div className="text-slate-300 text-xs">
                        Total: ${presetPricing.totalPrice.toLocaleString()} MXN
                      </div>
                      
                      {presetPricing.zone === 'discount' && presetPricing.discountPercentage > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
                          <TrendingDown size={14} />
                          <span>-{presetPricing.discountPercentage}%</span>
                        </div>
                      )}
                      
                      {presetPricing.zone === 'premium' && (
                        <div className="mt-2 text-xs text-yellow-400">
                          +{Math.round(((presetPricing.unitPrice / basePriceAt100) - 1) * 100 * 10) / 10}% premium
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Cantidad Personalizada */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <label className="block text-white font-semibold mb-3 flex items-center gap-2">
                  <Users size={20} className="text-purple-400" />
                  Cantidad Personalizada
                </label>
                <input
                  type="number"
                  min={MIN_LICENSES}
                  step="10"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(MIN_LICENSES, parseInt(e.target.value) || MIN_LICENSES))}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-lg font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <p className="text-sm text-slate-400 mt-2">
                  Mínimo {MIN_LICENSES} licencias
                </p>
              </div>

              {/* Barra de Progreso hacia Descuento */}
              {quantity < 1000 && (
                <div className="mt-6 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300 font-semibold">
                      {quantity < 100 
                        ? '¡Estás pagando precio premium!' 
                        : 'Progreso hacia máximo descuento'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {quantity < 100 
                        ? `${100 - quantity} licencias para precio base`
                        : `${1000 - quantity} licencias para 15% de descuento`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-green-500 transition-all duration-300"
                      style={{ width: `${getProgressToNextDiscount()}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Información de Seguridad */}
            <div className="bg-slate-900/50 backdrop-blur border border-green-500/20 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <Shield className="text-green-400 flex-shrink-0" size={32} />
                <div>
                  <h3 className="text-white font-bold mb-2">Compra Protegida</h3>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-400" />
                      Transacciones 100% seguras
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-400" />
                      Activación automática después del pago
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-400" />
                      Soporte técnico incluido
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Resumen y Pago */}
          <div className="space-y-6">
            {/* Resumen de Compra */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 backdrop-blur border-2 border-purple-500/30 rounded-2xl p-6 sticky top-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Award className="text-purple-400" />
                Resumen de Compra
              </h3>

              <div className="space-y-4">
                {/* Cantidad */}
                <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                  <span className="text-slate-400">Licencias:</span>
                  <span className="text-white font-bold text-2xl">{quantity}</span>
                </div>

                {/* Precio Unitario */}
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Precio unitario:</span>
                  <div className="text-right">
                    {pricing.zone === 'base' ? (
                      <span className="text-white font-semibold">
                        ${pricing.unitPrice} MXN
                      </span>
                    ) : pricing.zone === 'discount' ? (
                      <div>
                        <div className="text-slate-500 line-through text-xs">
                          ${basePriceAt100} MXN
                        </div>
                        <div className="text-green-400 font-bold">
                          ${pricing.unitPrice} MXN
                        </div>
                      </div>
                    ) : (
                      <span className="text-yellow-400 font-semibold">
                        ${pricing.unitPrice} MXN
                      </span>
                    )}
                  </div>
                </div>

                {/* Badge de Zona */}
                {pricing.zone === 'discount' && pricing.discountPercentage > 0 && (
                  <div className="flex items-center justify-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <Zap className="text-green-400" size={16} />
                    <span className="text-green-400 font-bold text-sm">
                      ¡Descuento del {pricing.discountPercentage}%!
                    </span>
                  </div>
                )}

                {pricing.zone === 'premium' && (
                  <div className="flex items-center justify-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <AlertCircle className="text-yellow-400" size={16} />
                    <span className="text-yellow-400 font-bold text-sm">
                      Precio Premium (+15%)
                    </span>
                  </div>
                )}

                {pricing.zone === 'base' && (
                  <div className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <Zap className="text-purple-400" size={16} />
                    <span className="text-purple-400 font-bold text-sm">
                      Precio Base (Referencia)
                    </span>
                  </div>
                )}

                {/* Ahorro */}
                {pricing.savings > 0 && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <div className="text-center">
                      <div className="text-slate-400 text-xs mb-1">Tu ahorro:</div>
                      <div className="text-green-400 font-bold text-2xl">
                        ${pricing.savings.toLocaleString()} MXN
                      </div>
                    </div>
                  </div>
                )}

                {pricing.savings < 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <div className="text-center">
                      <div className="text-slate-400 text-xs mb-1">Costo adicional:</div>
                      <div className="text-yellow-400 font-bold text-xl">
                        +${Math.abs(pricing.savings).toLocaleString()} MXN
                      </div>
                      <div className="text-slate-400 text-xs mt-1">
                        Compra 100+ para precio base
                      </div>
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="pt-4 border-t border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400">Total a pagar:</span>
                  </div>
                  <div className="text-right">
                    {pricing.zone !== 'base' && (
                      <div className="text-slate-500 line-through text-sm">
                        ${(basePriceAt100 * quantity).toLocaleString()} MXN
                      </div>
                    )}
                    <div className="text-white font-black text-4xl">
                      ${pricing.totalPrice.toLocaleString()}
                    </div>
                    <div className="text-slate-400 text-sm">MXN</div>
                  </div>
                </div>

                {/* Botón de Compra */}
                <button
                  onClick={handleRequestLicenses}
                  disabled={processing || quantity < MIN_LICENSES}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/50"
                >
                  {processing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Creando orden...</span>
                    </>
                  ) : (
                    <>
                      <Shield size={20} />
                      <span>Crear Orden de Compra</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
