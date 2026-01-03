'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  CreditCard,
  Shield,
  Package,
  Loader2,
  ArrowLeft,
  CheckCircle,
  Building,
  ShoppingCart,
  Upload,
  X,
} from 'lucide-react';

export default function PaymentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [organization, setOrganization] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | 'mercadopago'>('stripe');
  const [processing, setProcessing] = useState(false);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [showPayPalModal, setShowPayPalModal] = useState(false);
  const [paypalProcessing, setPaypalProcessing] = useState(false);
  const [paypalStep, setPaypalStep] = useState<'login' | 'confirm' | 'processing' | 'success'>('login');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'SCHOOL_ADMIN') {
      router.push('/dashboard');
    } else {
      fetchPendingOrders();
    }
  }, [status, session]);

  const fetchPendingOrders = async () => {
    try {
      const res = await fetch('/api/school-admin/dashboard');
      const result = await res.json();

      if (result.success) {
        setOrganization(result.organization);
        setPendingOrders(result.pendingOrders || []);
      } else {
        console.error('Error fetching data:', result.error);
      }
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no debe superar 5MB');
        return;
      }
      setProofImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProof = () => {
    setProofImage(null);
    setProofPreview(null);
  };

  const handlePayPalLogin = () => {
    setPaypalProcessing(true);
    // Simular login
    setTimeout(() => {
      setPaypalProcessing(false);
      setPaypalStep('confirm');
    }, 2000);
  };

  const handlePayPalConfirm = async () => {
    setPaypalProcessing(true);
    setPaypalStep('processing');

    // Simular procesamiento de pago
    setTimeout(async () => {
      try {
        const orderId = pendingOrders[0]?.id;
        
        // Llamar al endpoint de checkout con PayPal
        const res = await fetch('/api/school-admin/licenses/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            paymentMethod: 'paypal',
            proofUrl: null,
          }),
        });

        const result = await res.json();

        if (result.success) {
          setPaypalStep('success');
          
          // Redirigir después de 3 segundos
          setTimeout(() => {
            setShowPayPalModal(false);
            router.push('/dashboard/school-admin');
          }, 3000);
        } else {
          alert(result.error || 'Error al procesar el pago');
          setShowPayPalModal(false);
        }
      } catch (error: any) {
        console.error('Error processing PayPal payment:', error);
        alert('Error al procesar el pago');
        setShowPayPalModal(false);
      } finally {
        setPaypalProcessing(false);
      }
    }, 3000);
  };

  const handleProceedToPayment = async (orderId: string) => {
    // Si es PayPal, mostrar modal simulado
    if (paymentMethod === 'paypal') {
      setShowPayPalModal(true);
      setPaypalStep('login');
      return;
    }

    // Validar que si es transferencia, se haya subido comprobante
    if (paymentMethod === 'transfer' && !proofImage) {
      alert('Por favor, sube el comprobante de pago para continuar');
      return;
    }

    setProcessing(true);

    try {
      let proofUrl = null;

      // Si es transferencia, subir el comprobante primero
      if (paymentMethod === 'transfer' && proofImage) {
        setUploadingProof(true);
        const formData = new FormData();
        formData.append('file', proofImage);
        formData.append('orderId', orderId);

        const uploadRes = await fetch('/api/school-admin/licenses/upload-proof', {
          method: 'POST',
          body: formData,
        });

        const uploadResult = await uploadRes.json();
        
        if (!uploadRes.ok || !uploadResult.success) {
          console.error('Error al subir comprobante:', uploadResult);
          alert(`Error al subir el comprobante: ${uploadResult.error || 'Error desconocido'}`);
          setUploadingProof(false);
          setProcessing(false);
          return;
        }
        
        proofUrl = uploadResult.url;
        setUploadingProof(false);
      }

      const res = await fetch('/api/school-admin/licenses/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paymentMethod,
          proofUrl,
        }),
      });

      const result = await res.json();

      if (result.success) {
        if (paymentMethod === 'transfer') {
          // Mostrar modal con instrucciones de transferencia
          const instructions = result.instructions;
          const modal = document.createElement('div');
          modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4';
          modal.innerHTML = `
            <div class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-700 overflow-hidden">
              <!-- Header -->
              <div class="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <h2 class="text-2xl font-bold text-white">¡Orden Creada Exitosamente!</h2>
                    <p class="text-purple-100 text-sm mt-1">Referencia: ${result.order.id || instructions.reference}</p>
                  </div>
                </div>
              </div>
              
              <!-- Body -->
              <div class="p-6 space-y-4">
                <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <div class="flex gap-3">
                    <svg class="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <p class="text-yellow-200 text-sm">
                      Por favor realiza la transferencia con los siguientes datos. Tu orden será procesada una vez que el administrador verifique el comprobante.
                    </p>
                  </div>
                </div>
                
                <div class="bg-slate-800/50 rounded-xl p-6 border border-slate-700 space-y-4">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p class="text-slate-400 text-sm mb-1">Banco</p>
                      <p class="text-white font-semibold text-lg">${instructions.bank}</p>
                    </div>
                    <div>
                      <p class="text-slate-400 text-sm mb-1">Cuenta</p>
                      <p class="text-white font-mono">${instructions.account}</p>
                    </div>
                    <div>
                      <p class="text-slate-400 text-sm mb-1">CLABE</p>
                      <p class="text-white font-mono">${instructions.clabe}</p>
                    </div>
                    <div>
                      <p class="text-slate-400 text-sm mb-1">Beneficiario</p>
                      <p class="text-white font-semibold">${instructions.beneficiary}</p>
                    </div>
                  </div>
                  
                  <div class="border-t border-slate-700 pt-4 mt-4">
                    <div class="flex justify-between items-center">
                      <p class="text-slate-400 text-sm">Monto a transferir</p>
                      <p class="text-3xl font-bold text-purple-400">$${instructions.amount?.toLocaleString()} MXN</p>
                    </div>
                  </div>
                  
                  <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <p class="text-blue-200 text-xs font-medium mb-1">Importante: Usa esta referencia</p>
                    <p class="text-white font-mono text-sm">${instructions.reference}</p>
                  </div>
                </div>
              </div>
              
              <!-- Footer -->
              <div class="bg-slate-900 p-6 border-t border-slate-700">
                <button 
                  onclick="this.closest('.fixed').remove()" 
                  class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105"
                >
                  Entendido
                </button>
              </div>
            </div>
          `;
          document.body.appendChild(modal);
          setTimeout(() => {
            modal.remove();
            router.push('/dashboard/school-admin');
          }, 15000); // Auto-cerrar después de 15 segundos
        } else if (result.paymentUrl) {
          // Redirigir a Stripe
          window.location.href = result.paymentUrl;
        }
      } else {
        alert(result.error || 'Error al procesar el pago');
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      alert(`Error: ${error.message || 'Error de conexión'}`);
    } finally {
      setProcessing(false);
      setUploadingProof(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!pendingOrders.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Volver</span>
          </button>

          <div className="bg-slate-900/50 backdrop-blur border border-purple-500/20 rounded-2xl p-8 text-center">
            <Package className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              No hay órdenes pendientes
            </h2>
            <p className="text-slate-400">
              Todas tus órdenes han sido procesadas
            </p>
            <button
              onClick={() => router.push('/dashboard/school-admin')}
              className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalAmount = pendingOrders.reduce((sum, order) => sum + order.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Volver</span>
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Proceder al Pago
          </h1>
          <p className="text-slate-400">
            Completa el pago de tus licencias pendientes
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
              Director: {session?.user?.name || session?.user?.email}
            </p>
          </div>
        )}

        {/* Pending Orders */}
        <div className="bg-slate-900/50 backdrop-blur border border-purple-500/20 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <ShoppingCart size={24} className="text-purple-400" />
            Órdenes Pendientes
          </h2>

          <div className="space-y-4">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
              >
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Orden</p>
                    <p className="text-white font-semibold">#{order.id.slice(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Licencias</p>
                    <p className="text-white font-semibold">{order.quantity}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Tipo</p>
                    <p className="text-purple-300 font-semibold">
                      {order.paymentData && typeof order.paymentData === 'string' 
                        ? (() => {
                            try {
                              const data = JSON.parse(order.paymentData);
                              return data.type === 'VISION_MENTOR_PAYMENT' ? 'Mentorías' : order.tier;
                            } catch {
                              return order.tier;
                            }
                          })()
                        : order.paymentData?.type === 'VISION_MENTOR_PAYMENT' 
                          ? 'Mentorías' 
                          : order.tier
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Precio unitario</p>
                    <p className="text-blue-300 font-semibold">
                      ${(order.amount / order.quantity).toFixed(2)} MXN
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Total</p>
                    <p className="text-white font-bold text-lg">
                      ${order.amount.toLocaleString()} MXN
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Total a pagar:</span>
              <span className="text-3xl font-bold text-white">
                ${totalAmount.toLocaleString()} MXN
              </span>
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
                <svg className="h-8" viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg">
                  <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z" fill="#6772E5"/>
                </svg>
              </div>
              <p className="text-slate-400 text-sm">
                Paga con Apple pay de forma segura
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
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
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
                <svg className="h-8" viewBox="0 0 124 33" xmlns="http://www.w3.org/2000/svg">
                  <path d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.985-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.704.359.42.469 1.044.332 1.906zM66.654 13.075h-3.275a.57.57 0 0 0-.563.481l-.145.916-.229-.332c-.709-1.029-2.29-1.373-3.868-1.373-3.619 0-6.71 2.741-7.312 6.586-.313 1.918.132 3.752 1.22 5.031.998 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .562.66h2.95a.95.95 0 0 0 .939-.803l1.77-11.209a.568.568 0 0 0-.561-.658zm-4.565 6.374c-.316 1.871-1.801 3.127-3.695 3.127-.951 0-1.711-.305-2.199-.883-.484-.574-.668-1.391-.514-2.301.295-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.499.589.697 1.411.554 2.317zM84.096 13.075h-3.291a.954.954 0 0 0-.787.417l-4.539 6.686-1.924-6.425a.953.953 0 0 0-.912-.678h-3.234a.57.57 0 0 0-.541.754l3.625 10.638-3.408 4.811a.57.57 0 0 0 .465.9h3.287a.949.949 0 0 0 .781-.408l10.946-15.8a.57.57 0 0 0-.468-.895z" fill="#179BD7"/>
                  <path d="M94.992 6.749h-6.84a.95.95 0 0 0-.938.802l-2.766 17.537a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .938-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.971-1.142-2.694-1.746-4.983-1.746zm.789 6.405c-.373 2.454-2.248 2.454-4.062 2.454h-1.031l.725-4.583a.568.568 0 0 1 .562-.481h.473c1.234 0 2.4 0 3.002.704.359.42.468 1.044.331 1.906zM115.434 13.075h-3.273a.567.567 0 0 0-.562.481l-.145.916-.23-.332c-.709-1.029-2.289-1.373-3.867-1.373-3.619 0-6.709 2.741-7.311 6.586-.312 1.918.131 3.752 1.219 5.031 1 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .564.66h2.949a.95.95 0 0 0 .938-.803l1.771-11.209a.571.571 0 0 0-.565-.658zm-4.565 6.374c-.314 1.871-1.801 3.127-3.695 3.127-.949 0-1.711-.305-2.199-.883-.484-.574-.666-1.391-.514-2.301.297-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.501.589.699 1.411.554 2.317zM119.295 7.23l-2.807 17.858a.569.569 0 0 0 .562.658h2.822c.469 0 .867-.34.939-.803l2.768-17.536a.57.57 0 0 0-.562-.659h-3.16a.571.571 0 0 0-.562.482z" fill="#0E4595"/>
                  <path d="M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292a.316.316 0 0 1 .314-.268h9.38c3.114 0 5.263.648 6.385 1.927.526.6.861 1.227 1.023 1.917.17.724.173 1.589.007 2.644l-.012.077v.676l.526.298a3.69 3.69 0 0 1 1.065.812c.45.513.741 1.165.864 1.938.127.795.085 1.741-.123 2.812-.24 1.232-.628 2.305-1.152 3.183a6.547 6.547 0 0 1-1.825 2c-.696.494-1.523.869-2.458 1.109-.906.236-1.939.355-3.072.355h-.73c-.522 0-1.029.188-1.427.525a2.21 2.21 0 0 0-.744 1.328l-.055.299-.924 5.855-.042.215c-.011.068-.03.102-.058.125a.155.155 0 0 1-.096.035H7.266z" fill="#001C64"/>
                  <path d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83l-.399 2.533a.704.704 0 0 0 .695.814h4.881c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.336-1.03z" fill="#0E4595"/>
                  <path d="M21.754 7.151a9.757 9.757 0 0 0-1.203-.267 15.284 15.284 0 0 0-2.426-.177h-7.352a1.172 1.172 0 0 0-1.159.992L8.05 17.605l-.045.289a1.336 1.336 0 0 1 1.321-1.132h2.752c5.405 0 9.637-2.195 10.874-8.545.037-.188.068-.371.096-.55a6.594 6.594 0 0 0-1.017-.429 9.045 9.045 0 0 0-.277-.087z" fill="#00457C"/>
                  <path d="M9.614 7.699a1.169 1.169 0 0 1 1.159-.991h7.352c.871 0 1.684.057 2.426.177a9.757 9.757 0 0 1 1.481.353c.365.121.704.264 1.017.429.368-2.347-.003-3.945-1.272-5.392C20.378.682 17.853 0 14.622 0h-9.38c-.66 0-1.223.48-1.325 1.133L.01 25.898a.806.806 0 0 0 .795.932h5.791l1.454-9.225 1.564-9.906z" fill="#179BD7"/>
                </svg>
              </div>
              <p className="text-slate-400 text-sm">
                Paga de forma rápida y segura con tu cuenta PayPal
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
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
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
                <div className="h-8 w-auto flex items-center">
                  <img 
                    src="data:image/png;base64,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" 
                    alt="Mercado Pago"
                    className="h-full w-auto"
                  />
                </div>
              </div>
              <p className="text-slate-400 text-sm">
                Paga con tarjeta, débito o efectivo en México
              </p>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => handleProceedToPayment(pendingOrders[0].id)}
          disabled={processing || uploadingProof}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-500/50"
        >
          {uploadingProof ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Subiendo comprobante...</span>
            </>
          ) : processing ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Procesando pago...</span>
            </>
          ) : (
            <>
              <CreditCard size={20} />
              <span>
                {paymentMethod === 'transfer' 
                  ? 'Enviar Orden con Comprobante' 
                  : `Confirmar y Pagar ${totalAmount.toLocaleString()} MXN`}
              </span>
            </>
          )}
        </button>

        {paymentMethod === 'transfer' && !proofImage && (
          <p className="mt-2 text-center text-yellow-400 text-sm">
            ⚠️ Debes subir el comprobante de pago para continuar
          </p>
        )}

        {/* Security Notice */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Shield size={16} className="text-green-400" />
          <span>Transacción segura y encriptada</span>
        </div>
      </div>

      {/* PayPal Simulation Modal */}
      {showPayPalModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            {/* PayPal Header */}
            <div className="bg-[#0070BA] p-6">
              <div className="flex items-center justify-between">
                <svg className="h-8" viewBox="0 0 124 33" xmlns="http://www.w3.org/2000/svg">
                  <path d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.985-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.704.359.42.469 1.044.332 1.906zM66.654 13.075h-3.275a.57.57 0 0 0-.563.481l-.145.916-.229-.332c-.709-1.029-2.29-1.373-3.868-1.373-3.619 0-6.71 2.741-7.312 6.586-.313 1.918.132 3.752 1.22 5.031.998 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .562.66h2.95a.95.95 0 0 0 .939-.803l1.77-11.209a.568.568 0 0 0-.561-.658zm-4.565 6.374c-.316 1.871-1.801 3.127-3.695 3.127-.951 0-1.711-.305-2.199-.883-.484-.574-.668-1.391-.514-2.301.295-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.499.589.697 1.411.554 2.317zM84.096 13.075h-3.291a.954.954 0 0 0-.787.417l-4.539 6.686-1.924-6.425a.953.953 0 0 0-.912-.678h-3.234a.57.57 0 0 0-.541.754l3.625 10.638-3.408 4.811a.57.57 0 0 0 .465.9h3.287a.949.949 0 0 0 .781-.408l10.946-15.8a.57.57 0 0 0-.468-.895z" fill="white"/>
                  <path d="M94.992 6.749h-6.84a.95.95 0 0 0-.938.802l-2.766 17.537a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .938-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.971-1.142-2.694-1.746-4.983-1.746zm.789 6.405c-.373 2.454-2.248 2.454-4.062 2.454h-1.031l.725-4.583a.568.568 0 0 1 .562-.481h.473c1.234 0 2.4 0 3.002.704.359.42.468 1.044.331 1.906zM115.434 13.075h-3.273a.567.567 0 0 0-.562.481l-.145.916-.23-.332c-.709-1.029-2.289-1.373-3.867-1.373-3.619 0-6.709 2.741-7.311 6.586-.312 1.918.131 3.752 1.219 5.031 1 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .564.66h2.949a.95.95 0 0 0 .938-.803l1.771-11.209a.571.571 0 0 0-.565-.658zm-4.565 6.374c-.314 1.871-1.801 3.127-3.695 3.127-.949 0-1.711-.305-2.199-.883-.484-.574-.666-1.391-.514-2.301.297-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.501.589.699 1.411.554 2.317zM119.295 7.23l-2.807 17.858a.569.569 0 0 0 .562.658h2.822c.469 0 .867-.34.939-.803l2.768-17.536a.57.57 0 0 0-.562-.659h-3.16a.571.571 0 0 0-.562.482z" fill="white"/>
                  <path d="M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292a.316.316 0 0 1 .314-.268h9.38c3.114 0 5.263.648 6.385 1.927.526.6.861 1.227 1.023 1.917.17.724.173 1.589.007 2.644l-.012.077v.676l.526.298a3.69 3.69 0 0 1 1.065.812c.45.513.741 1.165.864 1.938.127.795.085 1.741-.123 2.812-.24 1.232-.628 2.305-1.152 3.183a6.547 6.547 0 0 1-1.825 2c-.696.494-1.523.869-2.458 1.109-.906.236-1.939.355-3.072.355h-.73c-.522 0-1.029.188-1.427.525a2.21 2.21 0 0 0-.744 1.328l-.055.299-.924 5.855-.042.215c-.011.068-.03.102-.058.125a.155.155 0 0 1-.096.035H7.266z" fill="white"/>
                  <path d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83l-.399 2.533a.704.704 0 0 0 .695.814h4.881c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.336-1.03z" fill="white"/>
                  <path d="M21.754 7.151a9.757 9.757 0 0 0-1.203-.267 15.284 15.284 0 0 0-2.426-.177h-7.352a1.172 1.172 0 0 0-1.159.992L8.05 17.605l-.045.289a1.336 1.336 0 0 1 1.321-1.132h2.752c5.405 0 9.637-2.195 10.874-8.545.037-.188.068-.371.096-.55a6.594 6.594 0 0 0-1.017-.429 9.045 9.045 0 0 0-.277-.087z" fill="white"/>
                  <path d="M9.614 7.699a1.169 1.169 0 0 1 1.159-.991h7.352c.871 0 1.684.057 2.426.177a9.757 9.757 0 0 1 1.481.353c.365.121.704.264 1.017.429.368-2.347-.003-3.945-1.272-5.392C20.378.682 17.853 0 14.622 0h-9.38c-.66 0-1.223.48-1.325 1.133L.01 25.898a.806.806 0 0 0 .795.932h5.791l1.454-9.225 1.564-9.906z" fill="white"/>
                </svg>
                <button
                  onClick={() => {
                    setShowPayPalModal(false);
                    setPaypalStep('login');
                  }}
                  className="text-white hover:text-gray-200"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* PayPal Body */}
            <div className="p-6 bg-gray-50">
              {paypalStep === 'login' && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-gray-800 text-center mb-6">
                    Inicia sesión en tu cuenta
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Correo electrónico o teléfono
                      </label>
                      <input
                        type="email"
                        defaultValue="demo@paypal.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={paypalProcessing}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contraseña
                      </label>
                      <input
                        type="password"
                        defaultValue="••••••••"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={paypalProcessing}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handlePayPalLogin}
                    disabled={paypalProcessing}
                    className="w-full bg-[#0070BA] hover:bg-[#005EA6] disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-full transition-colors flex items-center justify-center gap-2"
                  >
                    {paypalProcessing ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Verificando...
                      </>
                    ) : (
                      'Iniciar sesión'
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-500 mt-4">
                    🔒 Simulación de PayPal para pruebas
                  </p>
                </div>
              )}

              {paypalStep === 'confirm' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-800 text-center mb-4">
                    Confirmar pago
                  </h3>

                  <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Building className="text-blue-600" size={24} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{organization?.name}</p>
                        <p className="text-sm text-gray-500">Frutos del Espíritu</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Licencias:</span>
                        <span className="font-semibold text-gray-800">{pendingOrders[0]?.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo:</span>
                        <span className="font-semibold text-gray-800">{pendingOrders[0]?.tier}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span className="font-bold text-gray-800">Total:</span>
                        <span className="font-bold text-xl text-[#0070BA]">
                          ${pendingOrders[0]?.amount.toLocaleString()} MXN
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                    <Shield className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-blue-800">
                      Tu información está protegida por la garantía de compra de PayPal
                    </p>
                  </div>

                  <button
                    onClick={handlePayPalConfirm}
                    disabled={paypalProcessing}
                    className="w-full bg-[#FFC439] hover:bg-[#FFB900] disabled:bg-gray-400 text-gray-900 font-bold py-3 px-6 rounded-full transition-colors flex items-center justify-center gap-2"
                  >
                    {paypalProcessing ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Procesando...
                      </>
                    ) : (
                      'Pagar ahora'
                    )}
                  </button>

                  <button
                    onClick={() => setPaypalStep('login')}
                    disabled={paypalProcessing}
                    className="w-full text-[#0070BA] hover:underline text-sm font-medium"
                  >
                    Usar otra cuenta
                  </button>
                </div>
              )}

              {paypalStep === 'processing' && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#0070BA]" size={40} />
                  </div>
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
                  <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="text-green-600" size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    ¡Pago exitoso!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Tu orden ha sido procesada correctamente
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-green-800">
                      Las licencias serán activadas una vez que el administrador confirme el pago.
                    </p>
                  </div>
                  <p className="text-sm text-gray-500">
                    Redirigiendo al dashboard...
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
