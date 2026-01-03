'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, ArrowRight, Building2, Mail } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [organizationData, setOrganizationData] = useState<any>(null);

  useEffect(() => {
    const processPayment = async () => {
      const orderId = searchParams.get('order_id');
      const paymentId = searchParams.get('payment_intent') || searchParams.get('token') || searchParams.get('payment_id');

      if (!orderId) {
        setError('Orden no encontrada');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/pagos/institucional/process-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            paymentId,
          }),
        });

        const data = await res.json();

        if (data.success) {
          setOrganizationData(data);
        } else {
          setError(data.error || 'Error al procesar el pago');
        }
      } catch (err) {
        console.error('Error processing payment:', err);
        setError('Error al procesar el pago');
      } finally {
        setLoading(false);
      }
    };

    processPayment();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-white text-lg">Procesando tu pago...</p>
          <p className="text-gray-400 text-sm mt-2">Por favor espera un momento</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-red-500/20 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Error al Procesar</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard/suscripcion')}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            Volver a Suscripción
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-purple-500/20 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-400" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-2">
            ¡Pago Exitoso!
          </h1>
          <p className="text-gray-400 mb-8">
            Tu organización ha sido creada exitosamente
          </p>

          {/* Info Cards */}
          <div className="space-y-4 mb-8">
            <div className="bg-gray-900/50 rounded-lg p-4 border border-purple-500/20">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Tu Rol</h3>
              </div>
              <p className="text-gray-400">
                Has sido promovido a <span className="text-purple-400 font-semibold">DIRECTOR</span>
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-purple-500/10 rounded-lg p-6 border border-purple-500/30 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Próximos Pasos</h3>
            <ul className="text-left space-y-3 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">1.</span>
                <span>Accede a tu panel de director para gestionar tu organización</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">2.</span>
                <span>Crea coordinadores desde tu panel de administración</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">3.</span>
                <span>Comienza a asignar licencias a tus participantes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">4.</span>
                <span>Crea visiones y asigna coordinadores y mentores</span>
              </li>
            </ul>
          </div>

          {/* Action Button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Ir a Mi Dashboard
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Additional Info */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Si tienes alguna pregunta, contáctanos en soporte@quantumfrutos.com
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
