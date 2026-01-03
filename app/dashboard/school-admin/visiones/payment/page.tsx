'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CreditCard,
  ArrowLeft,
  CheckCircle,
  Building,
  ShoppingCart,
  Sparkles,
  Users,
  Phone,
  DollarSign,
  X,
} from 'lucide-react';

export default function VisionPaymentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | 'mercadopago'>('stripe');
  const [processing, setProcessing] = useState(false);
  const [showPayPalModal, setShowPayPalModal] = useState(false);
  const [paypalProcessing, setPaypalProcessing] = useState(false);
  const [paypalStep, setPaypalStep] = useState<'login' | 'confirm' | 'processing' | 'success'>('login');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'SCHOOL_ADMIN') {
      router.push('/dashboard');
    } else if (orderId) {
      fetchOrderDetails();
    }
  }, [status, session, orderId]);

  const fetchOrderDetails = async () => {
    try {
      const res = await fetch(`/api/school-admin/visiones/payment/${orderId}`);
      const result = await res.json();

      if (result.success) {
        setOrder(result.order);
        setOrganization(result.organization);
      } else {
        console.error('Error fetching order:', result.error);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalLogin = () => {
    setPaypalProcessing(true);
    setTimeout(() => {
      setPaypalProcessing(false);
      setPaypalStep('confirm');
    }, 2000);
  };

  const handlePayPalConfirm = async () => {
    setPaypalProcessing(true);
    setPaypalStep('processing');

    setTimeout(async () => {
      try {
        const res = await fetch('/api/school-admin/visiones/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            paymentMethod: 'paypal',
          }),
        });

        const result = await res.json();

        if (result.success) {
          setPaypalStep('success');
          setTimeout(() => {
            router.push('/dashboard/school-admin/visiones');
          }, 2000);
        } else {
          alert(`Error: ${result.error}`);
          setShowPayPalModal(false);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error al procesar el pago');
        setShowPayPalModal(false);
      } finally {
        setPaypalProcessing(false);
      }
    }, 3000);
  };

  const handleProceedToPayment = async () => {
    if (paymentMethod === 'paypal') {
      setShowPayPalModal(true);
      setPaypalStep('login');
      return;
    }

    setProcessing(true);

    try {
      const res = await fetch('/api/school-admin/visiones/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          paymentMethod,
        }),
      });

      const result = await res.json();

      if (result.success) {
        // Redirigir a página de éxito
        router.push('/dashboard/school-admin/visiones?payment=success');
      } else {
        alert(`Error: ${result.error || 'Error al procesar el pago'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar el pago. Por favor intenta nuevamente.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-10 h-10 text-[#00F0FF] animate-pulse mx-auto mb-4" />
          <p className="text-[#00F0FF] text-lg">Cargando información de pago...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Orden no encontrada</p>
          <button
            onClick={() => router.back()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const paymentData = typeof order.paymentData === 'string' 
    ? JSON.parse(order.paymentData) 
    : order.paymentData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050B14] via-[#0B1121] to-[#050B14] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-[#00F0FF] transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#00F0FF] to-[#7B2CBF] bg-clip-text text-transparent mb-2">
            Procesar Pago de Mentorías
          </h1>
          <p className="text-slate-400">
            Completa el pago de tu paquete de llamadas de disciplina
          </p>
        </div>

        {/* Organization Info */}
        {organization && (
          <div className="bg-slate-900/50 backdrop-blur border border-purple-500/20 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Building className="text-purple-400" size={24} />
              <h2 className="text-xl font-bold text-white">{organization.name}</h2>
            </div>
            <p className="text-slate-400 text-sm">
              {paymentData?.visionName || 'Visión'}
            </p>
          </div>
        )}

        {/* Order Details */}
        <div className="bg-slate-900/50 backdrop-blur border border-purple-500/20 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <ShoppingCart size={24} className="text-purple-400" />
            Detalles del Pedido
          </h2>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-slate-400 text-xs mb-1">Orden</p>
                <p className="text-white font-semibold">#{order.id.slice(0, 12)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Estudiantes
                </p>
                <p className="text-white font-semibold">{paymentData?.totalStudents || order.quantity}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Tipo
                </p>
                <p className="text-purple-300 font-semibold">Mentorías</p>
              </div>
            </div>

            {/* Mentores asignados */}
            {paymentData?.mentorAssignments && paymentData.mentorAssignments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-sm mb-3">Mentores asignados:</p>
                <div className="space-y-2">
                  {paymentData.mentorAssignments.map((assignment: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-slate-900/50 rounded-lg p-3">
                      <div>
                        <p className="text-white font-medium">{assignment.mentorName}</p>
                        <p className="text-slate-500 text-xs">
                          {assignment.studentCount} estudiante{assignment.studentCount !== 1 ? 's' : ''} × ${assignment.ratePerCall}/llamada
                        </p>
                      </div>
                      <p className="text-[#00FF94] font-bold">
                        ${assignment.totalCost.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-slate-700 pt-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total a pagar:</span>
                <span className="text-3xl font-bold text-white">
                  ${order.amount.toLocaleString()} MXN
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="bg-slate-900/50 backdrop-blur border border-purple-500/20 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <CreditCard size={24} className="text-purple-400" />
            Método de Pago
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stripe */}
            <button
              onClick={() => setPaymentMethod('stripe')}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                paymentMethod === 'stripe'
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'stripe'
                        ? 'border-indigo-500 bg-indigo-500'
                        : 'border-slate-600'
                    }`}
                  >
                    {paymentMethod === 'stripe' && (
                      <CheckCircle size={16} className="text-white" />
                    )}
                  </div>
                  <h3 className="text-white font-bold">Tarjeta</h3>
                </div>
              </div>
              <p className="text-slate-400 text-sm">
                Paga con tarjeta de crédito o débito
              </p>
            </button>

            {/* PayPal */}
            <button
              onClick={() => setPaymentMethod('paypal')}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                paymentMethod === 'paypal'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'paypal'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-slate-600'
                  }`}
                >
                  {paymentMethod === 'paypal' && (
                    <CheckCircle size={16} className="text-white" />
                  )}
                </div>
                <h3 className="text-white font-bold">PayPal</h3>
              </div>
              <p className="text-slate-400 text-sm">
                Paga de forma segura con PayPal
              </p>
            </button>

            {/* Mercado Pago */}
            <button
              onClick={() => setPaymentMethod('mercadopago')}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                paymentMethod === 'mercadopago'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'mercadopago'
                      ? 'border-cyan-500 bg-cyan-500'
                      : 'border-slate-600'
                  }`}
                >
                  {paymentMethod === 'mercadopago' && (
                    <CheckCircle size={16} className="text-white" />
                  )}
                </div>
                <h3 className="text-white font-bold">Mercado Pago</h3>
              </div>
              <p className="text-slate-400 text-sm">
                Paga con tarjeta, débito o efectivo en México
              </p>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleProceedToPayment}
          disabled={processing}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-500/50"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Procesando pago...
            </>
          ) : (
            <>
              <DollarSign size={20} />
              Procesar Pago (${order.amount.toLocaleString()} MXN)
            </>
          )}
        </button>
      </div>

      {/* PayPal Modal */}
      {showPayPalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#003087] to-[#0070ba] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-[#0070ba] p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.773.773 0 0 1 .761-.633h8.067c2.644 0 4.737.673 6.065 1.949 1.259 1.204 1.801 2.854 1.613 4.908-.348 3.796-2.681 6.226-5.947 6.226h-1.483a.77.77 0 0 0-.761.633l-.446 2.823a.643.643 0 0 1-.634.547H7.817a.643.643 0 0 1-.633-.74l.446-2.823.446-2.823z"/>
                </svg>
                <span className="text-white font-bold text-xl">PayPal</span>
              </div>
              <button
                onClick={() => setShowPayPalModal(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="bg-white p-8">
              {paypalStep === 'login' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-800 text-center mb-4">
                    Iniciar sesión en PayPal
                  </h3>
                  <p className="text-gray-600 text-center text-sm mb-6">
                    Serás redirigido a PayPal para completar tu pago de forma segura
                  </p>
                  <button
                    onClick={handlePayPalLogin}
                    disabled={paypalProcessing}
                    className="w-full bg-[#0070ba] hover:bg-[#003087] text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {paypalProcessing ? 'Conectando...' : 'Continuar con PayPal'}
                  </button>
                </div>
              )}

              {paypalStep === 'confirm' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-800 text-center mb-4">
                    Confirmar pago
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Monto:</span>
                      <span className="text-2xl font-bold text-gray-800">
                        ${order.amount.toLocaleString()} MXN
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Beneficiario:</span>
                      <span className="text-gray-700">{organization?.name}</span>
                    </div>
                  </div>
                  <button
                    onClick={handlePayPalConfirm}
                    disabled={paypalProcessing}
                    className="w-full bg-[#0070ba] hover:bg-[#003087] text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Confirmar y Pagar
                  </button>
                </div>
              )}

              {paypalStep === 'processing' && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0070ba] mx-auto mb-4"></div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    Procesando tu pago
                  </h3>
                  <p className="text-gray-600">
                    Por favor espera mientras confirmamos tu transacción...
                  </p>
                </div>
              )}

              {paypalStep === 'success' && (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    ¡Pago exitoso!
                  </h3>
                  <p className="text-gray-600">
                    Tu pago ha sido procesado correctamente
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
