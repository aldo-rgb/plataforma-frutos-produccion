'use client';

import { useEffect, useState } from 'react';
import { 
  Crown, 
  Calendar, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  CreditCard,
  History
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface MembershipStatus {
  active: boolean;
  startDate: string | null;
  expiryDate: string | null;
  approvedAt: string | null;
  autoRenewalEnabled: boolean;
  daysUntilExpiry: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

interface Renewal {
  id: number;
  renewalDate: string;
  expiryDate: string;
  amount: number;
  status: string;
  autoRenewed: boolean;
  createdAt: string;
}

export default function MiMembresiaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const [renewalHistory, setRenewalHistory] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchMembershipStatus();

    // Mostrar mensaje si viene de renovación exitosa
    if (searchParams.get('renewed') === 'true') {
      alert('✅ ¡Membresía renovada exitosamente! Tu acceso ha sido extendido por 1 año más.');
    }
  }, [searchParams]);

  const fetchMembershipStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mentor/membership/status');
      const data = await response.json();
      
      if (data.success) {
        setMembership(data.membership);
        setRenewalHistory(data.renewalHistory || []);
      } else if (response.status === 404) {
        alert('No tienes un perfil de mentor activo');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (enableAutoRenewal: boolean = false) => {
    const message = enableAutoRenewal 
      ? '¿Deseas renovar tu membresía con auto-renovación? Costo: $999 MXN/año (renovación automática)'
      : '¿Deseas renovar tu membresía por 1 año más? Costo: $999 MXN (pago único)';
    
    if (!confirm(message)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/mentor/membership/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableAutoRenewal })
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert('Error al crear sesión de pago: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar renovación');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleAutoRenewal = async () => {
    if (!membership) return;

    const newState = !membership.autoRenewalEnabled;
    const confirmMsg = newState
      ? '¿Activar renovación automática? Tu membresía se renovará automáticamente cada año.'
      : '¿Desactivar renovación automática? Deberás renovar manualmente antes de que expire.';

    if (!confirm(confirmMsg)) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/mentor/membership/toggle-auto-renewal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState })
      });

      const data = await response.json();

      if (data.success) {
        setMembership({ ...membership, autoRenewalEnabled: newState });
        alert(`✅ Renovación automática ${newState ? 'activada' : 'desactivada'}`);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar configuración');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 mt-4">Cargando membresía...</p>
        </div>
      </div>
    );
  }

  if (!membership) {
    return null;
  }

  const getStatusColor = () => {
    if (membership.isExpired) return 'text-red-400';
    if (membership.isExpiringSoon) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getStatusIcon = () => {
    if (membership.isExpired) return <XCircle className="w-6 h-6 text-red-400" />;
    if (membership.isExpiringSoon) return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
    return <CheckCircle className="w-6 h-6 text-green-400" />;
  };

  const getStatusText = () => {
    if (membership.isExpired) return 'Expirada';
    if (membership.isExpiringSoon) return `Expira pronto (${membership.daysUntilExpiry} días)`;
    return 'Activa';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-white">Mi Membresía</h1>
          </div>
          <p className="text-slate-400">Gestiona tu membresía anual como mentor certificado</p>
        </div>

        {/* Estado Actual */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Estado de Membresía</h2>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className={`font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>
            </div>
            {!membership.isExpired && membership.daysUntilExpiry !== null && (
              <div className="text-right">
                <div className="text-4xl font-bold text-purple-400">
                  {membership.daysUntilExpiry}
                </div>
                <div className="text-sm text-slate-400">días restantes</div>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-slate-400">Fecha de inicio</span>
              </div>
              <div className="text-white font-medium">
                {membership.startDate
                  ? new Date(membership.startDate).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'N/A'}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-slate-400">Fecha de expiración</span>
              </div>
              <div className="text-white font-medium">
                {membership.expiryDate
                  ? new Date(membership.expiryDate).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'N/A'}
              </div>
            </div>
          </div>

          {/* Alertas */}
          {membership.isExpired && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-red-400 font-semibold mb-1">Membresía Expirada</h3>
                  <p className="text-sm text-red-300">
                    Tu membresía ha expirado. Renueva ahora para seguir apareciendo en las listas de
                    mentores y poder agendar nuevas sesiones.
                  </p>
                </div>
              </div>
            </div>
          )}

          {membership.isExpiringSoon && !membership.isExpired && (
            <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-yellow-400 font-semibold mb-1">Renovación Próxima</h3>
                  <p className="text-sm text-yellow-300">
                    Tu membresía expira en {membership.daysUntilExpiry} días. 
                    {membership.autoRenewalEnabled
                      ? ' Se renovará automáticamente.'
                      : ' Renueva pronto para mantener tu acceso.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="space-y-4">
            {/* Botones de renovación */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleRenew(false)}
                disabled={processing}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                <CreditCard className="w-5 h-5" />
                {processing ? 'Procesando...' : 'Renovar Ahora ($999 MXN)'}
              </button>

              <button
                onClick={() => handleRenew(true)}
                disabled={processing}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                <RefreshCw className="w-5 h-5" />
                {processing ? 'Procesando...' : 'Renovar con Auto-Renovación'}
              </button>
            </div>

            {/* Toggle auto-renovación existente */}
            {membership.autoRenewalEnabled && (
              <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-green-400" />
                    <div>
                      <h3 className="text-green-400 font-semibold">Auto-Renovación Activa</h3>
                      <p className="text-sm text-green-300">Tu membresía se renovará automáticamente</p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleAutoRenewal}
                    disabled={processing}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                  >
                    Desactivar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Historial de Renovaciones */}
        {renewalHistory.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Historial de Renovaciones</h2>
            </div>

            <div className="space-y-3">
              {renewalHistory.map((renewal) => (
                <div
                  key={renewal.id}
                  className="bg-slate-800 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-white mb-1">
                      {new Date(renewal.renewalDate).toLocaleDateString('es-MX')} - 
                      {new Date(renewal.expiryDate).toLocaleDateString('es-MX')}
                    </div>
                    <div className="text-sm text-slate-400">
                      ${renewal.amount} MXN {renewal.autoRenewed && '(Auto-renovado)'}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      renewal.status === 'ACTIVE'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {renewal.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
