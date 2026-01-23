'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  DollarSign,
  Loader2,
  Save,
  CheckCircle,
  AlertCircle,
  Tag,
  Clock,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

interface DefaultPrice {
  id: number;
  organizationId: number;
  levelType: 'BASIC' | 'ADVANCED' | 'PL' | 'COMBO_FULL' | 'COMBO_ADV_PL';
  basePrice: number;
  promoPrice: number | null;
  promoDeadline: string | null;
  currency: 'MXN' | 'USD';
}

export default function DefaultPricesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Precios predeterminados para cada nivel
  const [prices, setPrices] = useState({
    BASIC: { basePrice: 3500, promoPrice: null as number | null, promoDeadline: '', currency: 'MXN' as 'MXN' | 'USD' },
    ADVANCED: { basePrice: 5000, promoPrice: null as number | null, promoDeadline: '', currency: 'MXN' as 'MXN' | 'USD' },
    PL: { basePrice: 7000, promoPrice: null as number | null, promoDeadline: '', currency: 'MXN' as 'MXN' | 'USD' },
    COMBO_FULL: { basePrice: 12000, promoPrice: null as number | null, promoDeadline: '', currency: 'MXN' as 'MXN' | 'USD' },
    COMBO_ADV_PL: { basePrice: 9500, promoPrice: null as number | null, promoDeadline: '', currency: 'MXN' as 'MXN' | 'USD' },
  });

  // Configuración de anticipos
  const [anticiposConfig, setAnticiposConfig] = useState({
    enabled: false,
    amount: 500,
    saving: false,
  });

  // Configuración de transferencias
  const [transfersConfig, setTransfersConfig] = useState({
    enabled: false,
    deadlineDays: 1, // Días antes del evento
    saving: false,
  });

  // Estado global de moneda
  const [globalCurrency, setGlobalCurrency] = useState<'MXN' | 'USD'>('MXN');

  // Función para cambiar la moneda de todos los precios
  const handleGlobalCurrencyChange = (currency: 'MXN' | 'USD') => {
    setGlobalCurrency(currency);
    const updatedPrices = { ...prices };
    Object.keys(updatedPrices).forEach((key) => {
      updatedPrices[key as keyof typeof prices].currency = currency;
    });
    setPrices(updatedPrices);
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'SCHOOL_ADMIN') {
      router.push('/dashboard');
    } else {
      fetchDefaultPrices();
      fetchAnticiposConfig();
      fetchTransfersConfig();
    }
  }, [status, session]);

  const fetchAnticiposConfig = async () => {
    try {
      const res = await fetch('/api/school-admin/anticipos-config');
      const data = await res.json();
      if (data.success) {
        setAnticiposConfig(prev => ({
          ...prev,
          enabled: data.anticiposEnabled || false,
          amount: data.anticipoAmount || 500,
        }));
      }
    } catch (error) {
      console.error('Error fetching anticipos config:', error);
    }
  };

  const handleSaveAnticipos = async () => {
    setAnticiposConfig(prev => ({ ...prev, saving: true }));
    try {
      const res = await fetch('/api/school-admin/anticipos-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anticiposEnabled: anticiposConfig.enabled,
          anticipoAmount: anticiposConfig.amount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', '✅ Configuración de anticipos guardada');
      } else {
        showNotification('error', data.error || 'Error al guardar');
      }
    } catch (error) {
      showNotification('error', 'Error al guardar configuración');
    } finally {
      setAnticiposConfig(prev => ({ ...prev, saving: false }));
    }
  };

  const fetchTransfersConfig = async () => {
    try {
      const res = await fetch('/api/school-admin/transfers-config');
      const data = await res.json();
      if (data.success) {
        setTransfersConfig(prev => ({
          ...prev,
          enabled: data.transfersEnabled || false,
          deadlineDays: data.transferDeadlineDays || 1,
        }));
      }
    } catch (error) {
      console.error('Error fetching transfers config:', error);
    }
  };

  const handleSaveTransfers = async () => {
    setTransfersConfig(prev => ({ ...prev, saving: true }));
    try {
      const res = await fetch('/api/school-admin/transfers-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transfersEnabled: transfersConfig.enabled,
          transferDeadlineDays: transfersConfig.deadlineDays,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', '✅ Configuración de transferencias guardada');
      } else {
        showNotification('error', data.error || 'Error al guardar');
      }
    } catch (error) {
      showNotification('error', 'Error al guardar configuración');
    } finally {
      setTransfersConfig(prev => ({ ...prev, saving: false }));
    }
  };

  const fetchDefaultPrices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/school-admin/default-prices');
      const data = await res.json();

      if (data.success && data.prices) {
        // Mapear precios obtenidos al estado
        const pricesMap: any = { ...prices };
        data.prices.forEach((p: DefaultPrice) => {
          if (pricesMap[p.levelType]) {
            pricesMap[p.levelType] = {
              basePrice: p.basePrice,
              promoPrice: p.promoPrice,
              promoDeadline: p.promoDeadline || '',
              currency: p.currency || 'MXN',
            };
          }
        });
        setPrices(pricesMap);
        
        // Establecer moneda global basada en el primer precio encontrado
        if (data.prices.length > 0) {
          setGlobalCurrency(data.prices[0].currency || 'MXN');
        }
      }
    } catch (error) {
      console.error('Error fetching default prices:', error);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSavePrice = async (levelType: keyof typeof prices) => {
    if (saving) return;

    try {
      setSaving(true);
      const res = await fetch('/api/school-admin/default-prices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelType,
          ...prices[levelType],
        }),
      });

      const data = await res.json();

      if (data.success) {
        showNotification('success', '✅ Precio predeterminado actualizado');
      } else {
        showNotification('error', data.error || 'Error al actualizar');
      }
    } catch (error) {
      console.error('Error updating price:', error);
      showNotification('error', 'Error al actualizar el precio');
    } finally {
      setSaving(false);
    }
  };

  const handlePriceChange = (levelType: keyof typeof prices, field: string, value: any) => {
    let processedValue = value;
    
    // Para campos numéricos, asegurar que sean números válidos
    if (field === 'basePrice' || field === 'promoPrice') {
      if (value === '' || value === null || value === undefined) {
        processedValue = field === 'basePrice' ? 0 : null;
      } else {
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        processedValue = isNaN(numValue) ? (field === 'basePrice' ? 0 : null) : numValue;
      }
    }
    
    setPrices({
      ...prices,
      [levelType]: {
        ...prices[levelType],
        [field]: processedValue,
      },
    });
  };

  const priceConfigs = [
    {
      key: 'BASIC' as const,
      name: 'Entrenamiento Básico',
      icon: '🌱',
      color: 'from-green-900/30 to-slate-900/50',
      borderColor: 'border-green-500/30',
      description: 'Precio predeterminado para nivel básico',
    },
    {
      key: 'ADVANCED' as const,
      name: 'Entrenamiento Avanzado',
      icon: '🔥',
      color: 'from-orange-900/30 to-slate-900/50',
      borderColor: 'border-orange-500/30',
      description: 'Precio predeterminado para nivel avanzado',
    },
    {
      key: 'PL' as const,
      name: 'Programa de Liderato',
      icon: '👑',
      color: 'from-purple-900/30 to-slate-900/50',
      borderColor: 'border-purple-500/30',
      description: 'Precio predeterminado para programa de liderazgo',
    },
    {
      key: 'COMBO_FULL' as const,
      name: 'Combo Completo',
      icon: '💎',
      color: 'from-blue-900/30 to-slate-900/50',
      borderColor: 'border-blue-500/30',
      description: 'Básico + Avanzado + PL (paquete completo)',
    },
    {
      key: 'COMBO_ADV_PL' as const,
      name: 'Combo Avanzado + PL',
      icon: '⚡',
      color: 'from-cyan-900/30 to-slate-900/50',
      borderColor: 'border-cyan-500/30',
      description: 'Avanzado + PL (paquete avanzado)',
    },
  ];

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
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <Link
            href="/dashboard/school-admin"
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="text-slate-400" size={20} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">
              💰 Precios Predeterminados
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Configura los precios que se usarán al crear nuevas visiones en el Vision Builder
            </p>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-lg border-2 flex items-center gap-3 ${
              notification.type === 'success'
                ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-300'
                : 'bg-red-900/20 border-red-500/50 text-red-300'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        )}

        {/* Currency Switch */}
        <div className="mb-6 bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border-2 border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Moneda</h3>
              <p className="text-slate-400 text-sm">Selecciona la moneda para todos los precios</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-900/80 rounded-xl p-2 border border-slate-600">
              <button
                onClick={() => handleGlobalCurrencyChange('MXN')}
                className={`px-6 py-3 rounded-lg font-bold transition-all ${
                  globalCurrency === 'MXN'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🇲🇽 Pesos MXN
              </button>
              <button
                onClick={() => handleGlobalCurrencyChange('USD')}
                className={`px-6 py-3 rounded-lg font-bold transition-all ${
                  globalCurrency === 'USD'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🇺🇸 Dólares USD
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-8 bg-blue-900/20 border-2 border-blue-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl">
              💡
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-300 mb-2">
                ¿Cómo funcionan los precios predeterminados?
              </h3>
              <p className="text-blue-200/80 text-sm leading-relaxed">
                Estos precios se aplicarán automáticamente cuando crees una nueva <strong>Visión</strong> en el Vision Builder. 
                Cada visión tendrá sus propios productos CORE con estos precios como punto de partida. 
                Luego podrás ajustar los precios específicos de cada visión si es necesario.
              </p>
            </div>
          </div>
        </div>

        {/* Anticipos Section - Only for Basic */}
        <div className="mb-8 bg-gradient-to-br from-amber-900/30 to-slate-900/50 border-2 border-amber-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">💳</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">Anticipos para Básico</h3>
              <p className="text-slate-400 text-sm">
                Permite que usuarios que abandonan el checkout reserven su lugar con un anticipo
              </p>
            </div>
            <button
              onClick={() => setAnticiposConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
            >
              {anticiposConfig.enabled ? (
                <ToggleRight className="w-10 h-10 text-amber-400" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-slate-500" />
              )}
            </button>
          </div>

          {anticiposConfig.enabled && (
            <div className="space-y-4 mt-4 pt-4 border-t border-amber-500/20">
              {/* Monto del anticipo */}
              <div>
                <label className="text-white font-semibold text-sm mb-2 block flex items-center gap-2">
                  <DollarSign size={16} />
                  Monto del Anticipo ({globalCurrency === 'MXN' ? '$' : 'USD $'})
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white font-bold text-lg"
                  value={anticiposConfig.amount}
                  onChange={(e) => setAnticiposConfig(prev => ({ 
                    ...prev, 
                    amount: parseFloat(e.target.value) || 0 
                  }))}
                  min="100"
                  step="100"
                  placeholder="500"
                />
                <p className="text-slate-400 text-xs mt-1">
                  Este monto se ofrecerá a usuarios que abandonen el proceso de pago
                </p>
              </div>

              {/* Info de cómo funciona */}
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-200/80">
                    <p className="font-semibold text-amber-300 mb-1">¿Cómo funciona?</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Si un usuario abandona el checkout por 5 minutos, se le enviará un email</li>
                      <li>Se le creará un ticket pendiente que podrá ver en "Mis Tickets"</li>
                      <li>Puede pagar el anticipo para reservar su lugar</li>
                      <li>Tiene hasta la <strong>1 PM del primer día</strong> de la visión para completar el pago</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-200/80">
                    <p className="font-semibold text-red-300 mb-1">Importante</p>
                    <p className="text-xs">
                      Los anticipos <strong>no son reembolsables ni transferibles</strong>. 
                      Si el usuario no completa el pago antes del deadline, pierde el anticipo.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón Guardar */}
              <button
                onClick={handleSaveAnticipos}
                disabled={anticiposConfig.saving}
                className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
              >
                {anticiposConfig.saving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Guardar Configuración de Anticipos
                  </>
                )}
              </button>
            </div>
          )}

          {!anticiposConfig.enabled && (
            <p className="text-slate-500 text-sm italic">
              Activa los anticipos para permitir pagos parciales en Básico
            </p>
          )}
        </div>

        {/* Sección de Transferencias */}
        <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border-2 border-cyan-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔄</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Transferencia de Tickets</h2>
                <p className="text-slate-400 text-sm">Permite que los usuarios transfieran sus tickets a otras personas</p>
              </div>
            </div>
            <button
              onClick={() => setTransfersConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`p-2 rounded-lg transition-all ${
                transfersConfig.enabled 
                  ? 'bg-cyan-500 text-white' 
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {transfersConfig.enabled ? (
                <ToggleRight size={32} />
              ) : (
                <ToggleLeft size={32} />
              )}
            </button>
          </div>

          {transfersConfig.enabled && (
            <div className="space-y-4 mt-4 pt-4 border-t border-cyan-500/20">
              {/* Días antes del evento */}
              <div>
                <label className="text-white font-semibold text-sm mb-2 block flex items-center gap-2">
                  <Clock size={16} />
                  Transferencias permitidas hasta (días antes del evento)
                </label>
                <select
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white font-bold text-lg"
                  value={transfersConfig.deadlineDays}
                  onChange={(e) => setTransfersConfig(prev => ({ 
                    ...prev, 
                    deadlineDays: parseInt(e.target.value) || 1 
                  }))}
                >
                  <option value={0}>Hasta el día del evento</option>
                  <option value={1}>1 día antes</option>
                  <option value={2}>2 días antes</option>
                  <option value={3}>3 días antes</option>
                  <option value={5}>5 días antes</option>
                  <option value={7}>1 semana antes</option>
                </select>
                <p className="text-slate-400 text-xs mt-1">
                  Los usuarios podrán transferir sus tickets hasta esta fecha límite
                </p>
              </div>

              {/* Info de cómo funciona */}
              <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-cyan-200/80">
                    <p className="font-semibold text-cyan-300 mb-1">¿Cómo funciona?</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>El usuario puede transferir desde la sección "Mis Tickets"</li>
                      <li>Debe ingresar el email del destinatario</li>
                      <li>Si el destinatario no existe, se creará su cuenta automáticamente</li>
                      <li>Un ticket <strong>solo puede transferirse UNA vez</strong></li>
                      <li>Se transfieren TODOS los tickets del usuario para esa visión (Básico, Avanzado, PL)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botón Guardar */}
              <button
                onClick={handleSaveTransfers}
                disabled={transfersConfig.saving}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
              >
                {transfersConfig.saving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Guardar Configuración de Transferencias
                  </>
                )}
              </button>
            </div>
          )}

          {!transfersConfig.enabled && (
            <p className="text-slate-500 text-sm italic">
              Activa las transferencias para permitir que los usuarios cedan sus tickets
            </p>
          )}
        </div>

        {/* Price Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {priceConfigs.map((config) => (
            <div
              key={config.key}
              className={`bg-gradient-to-br ${config.color} rounded-xl p-6 border-2 ${config.borderColor}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">{config.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{config.name}</h3>
                  <p className="text-slate-400 text-sm">{config.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Precio Base */}
                <div>
                  <label className="text-white font-semibold text-sm mb-2 block flex items-center gap-2">
                    <DollarSign size={16} />
                    Precio Base ({globalCurrency === 'MXN' ? '$' : 'USD $'})
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white font-bold text-lg"
                    value={prices[config.key].basePrice || ''}
                    onChange={(e) =>
                      handlePriceChange(config.key, 'basePrice', e.target.value)
                    }
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Precio Promocional */}
                <div>
                  <label className="text-white font-semibold text-sm mb-2 block flex items-center gap-2">
                    <Tag size={16} />
                    Precio Promocional (Opcional) ({globalCurrency === 'MXN' ? '$' : 'USD $'})
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                    value={prices[config.key].promoPrice || ''}
                    onChange={(e) =>
                      handlePriceChange(
                        config.key,
                        'promoPrice',
                        e.target.value
                      )
                    }
                    min="0"
                    step="0.01"
                    placeholder="Sin promoción"
                  />
                </div>

                {/* Fecha Límite Promoción */}
                {prices[config.key].promoPrice && (
                  <div>
                    <label className="text-white font-semibold text-sm mb-2 block">
                      Fecha Límite Promoción
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                      value={prices[config.key].promoDeadline}
                      onChange={(e) =>
                        handlePriceChange(config.key, 'promoDeadline', e.target.value)
                      }
                    />
                  </div>
                )}

                {/* Botón Guardar */}
                <button
                  onClick={() => handleSavePrice(config.key)}
                  disabled={saving}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Guardar Precio
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
