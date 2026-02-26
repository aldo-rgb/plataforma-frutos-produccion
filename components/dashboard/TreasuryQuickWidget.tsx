'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Wallet, Receipt, Plus, DollarSign, 
  CheckCircle, Clock, AlertTriangle, X,
  Copy, QrCode, ArrowRight, Banknote, Share2, Download, Trash2, Ban,
  CreditCard, Smartphone, Loader2, Wifi, WifiOff, Users
} from 'lucide-react';
import Link from 'next/link';

interface PaymentCode {
  id: number;
  code: string;
  amount: number;
  reference: string;
  status: 'ACTIVE' | 'REDEEMED' | 'CANCELLED';
  createdAt: string;
  visionName?: string;
}

interface ExpenseSummary {
  pending: number;
  approved: number;
  totalPending: number;
  totalApproved: number;
}

interface Vision {
  id: number;
  nombre: string;
  organizationName?: string;
}

interface Product {
  id: string;
  visionId: number | null;
  productId: number | null;
  name: string;
  type: 'VISION' | 'TRAINING' | 'WORKSHOP';
  organizationId: number;
  organizationName: string;
}

interface Participante {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  saldoPendiente?: number;
  totalPagado?: number;
}

interface ParticipantInfo {
  participant: {
    id: number;
    nombre: string;
    email: string;
    telefono?: string;
  };
  progression: {
    completedLevels: string[];
    nextLevel: string;
    nextLevelName: string;
    isGraduate: boolean;
  };
  nextVision: {
    id: number;
    nombre: string;
    level: string;
    startDate: string;
  } | null;
  payment: {
    hasPendingTicket: boolean;
    ticketId: string | null;
    pendingAmount: number;
    suggestedPrice: number;
    promoPrice: number | null;
  };
}

interface POSDevice {
  id: string;
  pos_id: string;
  operating_mode: string;
  store_id?: string;
}

interface POSTransaction {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'ERROR';
  amount: number;
  reference: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'SUPPLIES', label: 'Materiales', icon: '📦' },
  { value: 'TRANSPORT', label: 'Transporte', icon: '🚗' },
  { value: 'FOOD', label: 'Alimentos', icon: '🍽️' },
  { value: 'VENUE', label: 'Renta', icon: '🏛️' },
  { value: 'EQUIPMENT', label: 'Equipo', icon: '🖥️' },
  { value: 'MARKETING', label: 'Marketing', icon: '📢' },
  { value: 'OTHER', label: 'Otro', icon: '📋' },
];

interface OrganizationInfo {
  nombre: string;
  logoUrl: string | null;
  brandColor: string;
}

interface TreasuryQuickWidgetProps {
  isAdmin?: boolean;
}

export default function TreasuryQuickWidget({ isAdmin = false }: TreasuryQuickWidgetProps) {
  const [activeTab, setActiveTab] = useState<'cobro' | 'gasto'>('cobro');
  const [loading, setLoading] = useState(false);
  const [visiones, setVisiones] = useState<Vision[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentCodes, setRecentCodes] = useState<PaymentCode[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary>({
    pending: 0,
    approved: 0,
    totalPending: 0,
    totalApproved: 0
  });
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo>({
    nombre: 'Organización',
    logoUrl: null,
    brandColor: '#10B981'
  });
  
  // Ref para capturar la tarjeta como imagen
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Form cobro
  const [cobroForm, setCobroForm] = useState({
    amount: '',
    reference: '',
    visionId: '',
    participanteId: ''
  });
  const [generatedCode, setGeneratedCode] = useState<PaymentCode | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Participantes de la visión seleccionada
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loadingParticipantes, setLoadingParticipantes] = useState(false);
  const [searchParticipante, setSearchParticipante] = useState('');
  const [selectedParticipante, setSelectedParticipante] = useState<Participante | null>(null);
  
  // Form gasto
  const [gastoForm, setGastoForm] = useState({
    concept: '',
    amount: '',
    category: 'OTHER',
    visionId: ''
  });
  
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });
  
  // Estado para cancelar código
  const [cancellingCode, setCancellingCode] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<PaymentCode | null>(null);

  // Estados para Quantum POS
  const [paymentMode, setPaymentMode] = useState<'cash' | 'card'>('cash');
  const [posDevices, setPosDevices] = useState<POSDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [posConfigured, setPosConfigured] = useState<boolean | null>(null);
  const [loadingPOS, setLoadingPOS] = useState(false);
  const [activePOSTransaction, setActivePOSTransaction] = useState<POSTransaction | null>(null);
  const [participantInfo, setParticipantInfo] = useState<ParticipantInfo | null>(null);
  const [showReceiverPaymentModal, setShowReceiverPaymentModal] = useState(false);

  useEffect(() => {
    fetchInitialData();
    // Cargar dispositivos POS al inicio
    fetchPOSDevices();
  }, []);

  // Cargar participantes cuando se selecciona una visión
  useEffect(() => {
    if (cobroForm.visionId) {
      fetchParticipantes(cobroForm.visionId);
    } else {
      setParticipantes([]);
      setSelectedParticipante(null);
      setSearchParticipante('');
    }
  }, [cobroForm.visionId]);

  // Cargar info del participante cuando se selecciona uno
  useEffect(() => {
    if (selectedParticipante) {
      fetchParticipantInfo(selectedParticipante.id);
    } else {
      setParticipantInfo(null);
    }
  }, [selectedParticipante]);

  const fetchParticipantes = async (visionId: string) => {
    setLoadingParticipantes(true);
    try {
      const res = await fetch(`/api/treasury/vision-participants?visionId=${visionId}`);
      if (res.ok) {
        const data = await res.json();
        setParticipantes(data.participants || []);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoadingParticipantes(false);
    }
  };

  // Cargar dispositivos POS de Mercado Pago Point
  const fetchPOSDevices = async () => {
    try {
      // Intentar primero con Mercado Pago Point
      const mpRes = await fetch('/api/treasury/mercadopago-point?action=devices');
      if (mpRes.ok) {
        const data = await mpRes.json();
        if (data.configured && data.devices?.length > 0) {
          setPosConfigured(true);
          setPosDevices(data.devices.map((d: any) => ({
            id: d.id,
            pos_id: d.pos_id || d.id,
            operating_mode: d.operating_mode || 'PDV',
            store_id: d.store_id,
          })));
          setSelectedDevice(data.devices[0].id);
          return;
        }
      }
      
      // Fallback a Stripe Terminal si MP no está configurado
      const stripeRes = await fetch('/api/treasury/quantum-pos');
      if (stripeRes.ok) {
        const data = await stripeRes.json();
        setPosConfigured(data.configured);
        setPosDevices(data.devices || []);
        if (data.devices?.length > 0) {
          setSelectedDevice(data.devices[0].id);
        }
      } else {
        setPosConfigured(false);
      }
    } catch (error) {
      console.error('Error fetching POS devices:', error);
      setPosConfigured(false);
    }
  };

  // Obtener info detallada del participante (nivel, siguiente visión, etc.)
  const fetchParticipantInfo = async (participantId: number) => {
    try {
      const res = await fetch(`/api/treasury/participant-info?participantId=${participantId}`);
      if (res.ok) {
        const data = await res.json();
        setParticipantInfo(data);
        // Auto-llenar el monto si hay saldo pendiente
        if (data.payment?.pendingAmount > 0) {
          setCobroForm(prev => ({ 
            ...prev, 
            amount: data.payment.pendingAmount.toString(),
            reference: `Pago ${data.progression.nextLevelName} - ${data.participant.nombre}`
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching participant info:', error);
    }
  };

  // Detectar si el dispositivo es de Mercado Pago Point
  const isMercadoPagoDevice = (deviceId: string) => {
    // Los dispositivos de MP Point tienen formatos como: "PAX_A910__SMARTPOS1234567890"
    // o IDs numéricos largos
    return deviceId.includes('PAX') || deviceId.includes('SMARTPOS') || /^\d{10,}$/.test(deviceId);
  };

  // Enviar cobro a terminal POS (Mercado Pago Point o Stripe)
  const handleSendToPOS = async () => {
    if (!selectedDevice || !cobroForm.amount || parseFloat(cobroForm.amount) <= 0) {
      showNotification('error', 'Selecciona un dispositivo y monto válido');
      return;
    }

    if (!selectedParticipante) {
      showNotification('error', 'Selecciona un participante para cobrar con tarjeta');
      return;
    }

    setLoadingPOS(true);
    try {
      // Determinar qué API usar basado en el tipo de dispositivo
      const useMercadoPago = isMercadoPagoDevice(selectedDevice);
      const apiUrl = useMercadoPago 
        ? '/api/treasury/mercadopago-point' 
        : '/api/treasury/quantum-pos';

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: selectedDevice,
          amount: parseFloat(cobroForm.amount),
          description: cobroForm.reference || `Pago ${selectedParticipante.nombre}`,
          externalReference: `QM-${Date.now()}`,
          participantId: selectedParticipante.id,
          participantName: selectedParticipante.nombre,
          visionId: cobroForm.visionId || null,
          ticketLevel: participantInfo?.progression?.nextLevel || null
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setActivePOSTransaction({
          id: data.paymentIntent.id,
          status: 'PENDING',
          amount: parseFloat(cobroForm.amount),
          reference: data.paymentIntent.reference
        });
        showNotification('success', useMercadoPago 
          ? '📲 Cobro enviado a terminal Point. Esperando pago...'
          : '📲 Cobro enviado a terminal. Esperando pago...'
        );
        
        // Iniciar polling para verificar estado del pago
        if (useMercadoPago) {
          startPaymentStatusPolling(data.paymentIntent.id);
        }
      } else {
        showNotification('error', data.error || 'Error al enviar a terminal');
      }
    } catch (error) {
      showNotification('error', 'Error de conexión con terminal');
    } finally {
      setLoadingPOS(false);
    }
  };

  // Polling para verificar estado del pago en Mercado Pago Point
  const startPaymentStatusPolling = (paymentIntentId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/treasury/mercadopago-point?action=status&paymentIntentId=${paymentIntentId}`);
        if (res.ok) {
          const data = await res.json();
          const state = data.paymentIntent?.state;
          
          if (state === 'FINISHED') {
            clearInterval(pollInterval);
            setActivePOSTransaction(prev => prev ? { ...prev, status: 'APPROVED' } : null);
            showNotification('success', '✅ ¡Pago aprobado!');
            // Limpiar después de 3 segundos
            setTimeout(() => {
              setActivePOSTransaction(null);
              setCobroForm({ amount: '', reference: '', visionId: '', participanteId: '' });
              setSelectedParticipante(null);
              fetchInitialData();
            }, 3000);
          } else if (state === 'CANCELED' || state === 'ERROR') {
            clearInterval(pollInterval);
            setActivePOSTransaction(prev => prev ? { ...prev, status: state === 'CANCELED' ? 'CANCELLED' : 'ERROR' } : null);
            showNotification('error', state === 'CANCELED' ? 'Pago cancelado' : 'Error en el pago');
            setTimeout(() => setActivePOSTransaction(null), 3000);
          }
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    }, 3000); // Verificar cada 3 segundos

    // Detener polling después de 5 minutos
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 5 * 60 * 1000);
  };

  // Cancelar transacción POS activa
  const handleCancelPOS = async () => {
    if (!activePOSTransaction || !selectedDevice) return;

    try {
      const useMercadoPago = isMercadoPagoDevice(selectedDevice);
      const deleteUrl = useMercadoPago
        ? `/api/treasury/mercadopago-point?deviceId=${selectedDevice}&paymentIntentId=${activePOSTransaction.id}`
        : `/api/treasury/quantum-pos?deviceId=${selectedDevice}&paymentIntentId=${activePOSTransaction.id}`;
      
      const res = await fetch(deleteUrl, { method: 'DELETE' });
      
      if (res.ok) {
        setActivePOSTransaction(null);
        showNotification('success', 'Cobro cancelado');
      }
    } catch (error) {
      showNotification('error', 'Error al cancelar');
    }
  };

  const fetchInitialData = async () => {
    try {
      // Fetch products from all organizations in the same Master Organization
      const productsRes = await fetch('/api/treasury/products');
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
        // También actualizar visiones para compatibilidad
        setVisiones(data.visiones?.map((v: any) => ({
          id: v.id,
          nombre: v.nombre,
          organizationName: v.organizationName
        })) || []);
      }

      // Fetch recent codes
      const codesRes = await fetch('/api/treasury/payment-codes?limit=3');
      if (codesRes.ok) {
        const data = await codesRes.json();
        setRecentCodes(data.codes || []);
      }

      // Fetch expense summary
      const expensesRes = await fetch('/api/treasury/expenses?summary=true');
      if (expensesRes.ok) {
        const data = await expensesRes.json();
        setExpenseSummary(data.summary || {
          pending: 0,
          approved: 0,
          totalPending: 0,
          totalApproved: 0
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: 'success', message: '' }), 3000);
  };

  const handleGenerarCodigo = async () => {
    if (!cobroForm.amount || parseFloat(cobroForm.amount) <= 0) {
      showNotification('error', 'Ingresa un monto válido');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/treasury/payment-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(cobroForm.amount),
          reference: cobroForm.reference || (selectedParticipante ? `Pago ${selectedParticipante.nombre}` : `Cobro $${cobroForm.amount}`),
          visionId: cobroForm.visionId || null,
          participanteId: cobroForm.participanteId || null
        })
      });

      const data = await res.json();
      console.log('API Response:', data); // Debug
      
      if (data.success) {
        // La API devuelve paymentCode
        const paymentCode = data.paymentCode;
        console.log('Payment Code:', paymentCode); // Debug
        
        // Guardar info de la organización
        if (data.organization) {
          setOrgInfo(data.organization);
        }
        
        // Añadir nombre de visión si existe
        const visionName = cobroForm.visionId 
          ? visiones.find(v => v.id.toString() === cobroForm.visionId)?.nombre 
          : undefined;
        
        setGeneratedCode({ 
          id: paymentCode.id,
          code: paymentCode.code,
          amount: Number(paymentCode.amount) || 0,
          reference: paymentCode.reference || `Cobro $${cobroForm.amount}`,
          status: paymentCode.status,
          createdAt: paymentCode.createdAt,
          visionName 
        });
        setShowCodeModal(true);
        setCobroForm({ amount: '', reference: '', visionId: '', participanteId: '' });
        setSelectedParticipante(null);
        setSearchParticipante('');
        fetchInitialData();
      } else {
        showNotification('error', data.error || 'Error al generar código');
      }
    } catch (error) {
      showNotification('error', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarGasto = async () => {
    if (!gastoForm.concept || !gastoForm.amount || parseFloat(gastoForm.amount) <= 0) {
      showNotification('error', 'Completa concepto y monto');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/treasury/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: gastoForm.concept,
          amount: parseFloat(gastoForm.amount),
          category: gastoForm.category,
          visionId: gastoForm.visionId || null,
          deductedFromCash: true
        })
      });

      const data = await res.json();
      
      if (data.success) {
        showNotification('success', '¡Gasto registrado!');
        setGastoForm({ concept: '', amount: '', category: 'OTHER', visionId: '' });
        fetchInitialData();
      } else {
        showNotification('error', data.error || 'Error al registrar gasto');
      }
    } catch (error) {
      showNotification('error', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Verificar si un código puede ser cancelado (dentro de 24 horas y no usado)
  const canCancelCode = (code: PaymentCode): { canCancel: boolean; reason?: string } => {
    // Solo códigos ACTIVE pueden cancelarse
    if (code.status !== 'ACTIVE') {
      return { canCancel: false, reason: 'Este código ya fue utilizado o cancelado' };
    }
    
    // Verificar que esté dentro de las 24 horas
    const createdAt = new Date(code.createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      return { canCancel: false, reason: 'Solo se puede cancelar dentro de las primeras 24 horas' };
    }
    
    return { canCancel: true };
  };

  // Cancelar un código de pago
  const handleCancelCode = async (code: PaymentCode) => {
    const { canCancel, reason } = canCancelCode(code);
    
    if (!canCancel) {
      showNotification('error', reason || 'No se puede cancelar este código');
      return;
    }
    
    setCancellingCode(code.code);
    try {
      const res = await fetch(`/api/treasury/payment-codes/${code.code}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await res.json();
      
      if (data.success) {
        showNotification('success', 'Código cancelado correctamente');
        setShowCancelConfirm(null);
        fetchInitialData();
      } else {
        showNotification('error', data.error || 'Error al cancelar código');
      }
    } catch (error) {
      showNotification('error', 'Error de conexión');
    } finally {
      setCancellingCode(null);
    }
  };

  const shareCode = async () => {
    if (!generatedCode) return;
    
    const shareText = `💰 CODIGO DE REFERENCIA

📋 Referencia: ${generatedCode.code}
💵 Monto: ${formatMoney(generatedCode.amount)}
📝 Concepto: ${generatedCode.reference}
${generatedCode.visionName ? `🎯 Visión: ${generatedCode.visionName}` : ''}
📅 Fecha: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}

⚡ Presenta este código para realizar tu pago`;

    try {
      // Intentar capturar la tarjeta como imagen
      if (cardRef.current) {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: '#1e293b',
          scale: 2,
          useCORS: true,
          allowTaint: true
        });
        
        // Convertir canvas a blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            resolve(blob!);
          }, 'image/png', 1.0);
        });
        
        const file = new File([blob], `referencia-${generatedCode.code}.png`, { type: 'image/png' });
        
        // Verificar si el navegador soporta compartir archivos
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Codigo de Referencia',
            text: shareText,
            files: [file]
          });
          return;
        }
      }
      
      // Si no puede compartir con imagen, solo texto
      if (navigator.share) {
        await navigator.share({
          title: 'Codigo de Referencia',
          text: shareText
        });
      } else {
        navigator.clipboard.writeText(shareText);
        showNotification('success', 'Texto copiado al portapapeles');
      }
    } catch (err) {
      // Si falla el share, copiar al portapapeles
      navigator.clipboard.writeText(shareText);
      showNotification('success', 'Texto copiado al portapapeles');
    }
  };

  const formatMoney = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return '$0';
    }
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) {
      return new Date().toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return new Date().toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
    <div className="bg-gradient-to-br from-indigo-900/40 via-slate-900 to-purple-900/30 border border-indigo-500/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-indigo-500/20 bg-gradient-to-r from-indigo-900/30 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Wallet className="text-indigo-400" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Tesorería Express</h3>
              <p className="text-xs text-slate-400">Cobros y gastos rápidos</p>
            </div>
          </div>
          <Link 
            href={isAdmin ? "/dashboard/school-admin/treasury" : "/dashboard/coordinador/treasury"}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Ver todo <ArrowRight size={14} />
          </Link>
        </div>
      </div>
      {/* Tabs */}
      <div className="flex border-b border-slate-700/50">
        <button
          onClick={() => setActiveTab('cobro')}
          className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'cobro'
              ? 'text-green-400 border-b-2 border-green-400 bg-green-500/10'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Banknote size={18} />
          Generar Cobro
        </button>
        <button
          onClick={() => setActiveTab('gasto')}
          className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'gasto'
              ? 'text-red-400 border-b-2 border-red-400 bg-red-500/10'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Receipt size={18} />
          Registrar Gasto
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Notification */}
        {notification.show && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
            notification.type === 'success' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {notification.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {notification.message}
          </div>
        )}

        {activeTab === 'cobro' ? (
          <div className="space-y-4">
            {/* Último código generado - Mini preview con botón para ver */}
            {generatedCode && (
              <div 
                onClick={() => setShowCodeModal(true)}
                className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl cursor-pointer hover:bg-green-500/20 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                      <CheckCircle size={18} className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-green-400 font-semibold">ÚLTIMO CÓDIGO</p>
                      <code className="text-lg font-mono font-bold text-white tracking-wider">
                        {generatedCode.code}
                      </code>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold">{formatMoney(generatedCode.amount)}</p>
                    <p className="text-xs text-slate-400">Clic para ver</p>
                  </div>
                </div>
              </div>
            )}

            {/* Toggle Modo de Pago: Efectivo / Tarjeta */}
            <div className="flex items-center justify-center gap-2 p-2 bg-slate-800/30 rounded-xl">
              <button
                onClick={() => setPaymentMode('cash')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${
                  paymentMode === 'cash'
                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/20'
                    : 'bg-slate-700/50 text-slate-400 hover:text-white'
                }`}
              >
                <DollarSign size={18} />
                Efectivo
              </button>
              <button
                onClick={() => setPaymentMode('card')}
                disabled={posConfigured === false || (posConfigured === true && posDevices.length === 0)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${
                  paymentMode === 'card'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-700/50 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
                title={
                  posConfigured === null 
                    ? 'Verificando terminal POS...' 
                    : posConfigured === false 
                      ? 'Terminal POS no configurada' 
                      : posDevices.length === 0 
                        ? 'No hay terminales POS vinculadas' 
                        : 'Cobrar con tarjeta'
                }
              >
                {posConfigured === null ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CreditCard size={18} />
                )}
                Tarjeta
              </button>
            </div>

            {/* Info de transacción POS activa */}
            {activePOSTransaction && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping" />
                    <span className="text-blue-400 font-semibold">Esperando pago...</span>
                  </div>
                  <span className="text-xl font-bold text-white">{formatMoney(activePOSTransaction.amount)}</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">Referencia: {activePOSTransaction.reference}</p>
                <button
                  onClick={handleCancelPOS}
                  className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all text-sm"
                >
                  Cancelar Cobro
                </button>
              </div>
            )}

            {/* Info del participante seleccionado */}
            {participantInfo && selectedParticipante && (
              <div className="p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-purple-400 font-semibold">PROGRESO DEL PARTICIPANTE</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    participantInfo.progression.currentLevel === 'BASIC' ? 'bg-green-500/20 text-green-400' :
                    participantInfo.progression.currentLevel === 'ADVANCED' ? 'bg-blue-500/20 text-blue-400' :
                    participantInfo.progression.currentLevel === 'PL' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {participantInfo.progression.currentLevelName}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                  <div className={`p-2 rounded-lg ${participantInfo.progression.completedLevels.includes('BASIC') ? 'bg-green-500/20' : 'bg-slate-700/50'}`}>
                    <span className="text-lg">{participantInfo.progression.completedLevels.includes('BASIC') ? '✅' : '⬜'}</span>
                    <p className="text-[10px] text-slate-400">Básico</p>
                  </div>
                  <div className={`p-2 rounded-lg ${participantInfo.progression.completedLevels.includes('ADVANCED') ? 'bg-blue-500/20' : 'bg-slate-700/50'}`}>
                    <span className="text-lg">{participantInfo.progression.completedLevels.includes('ADVANCED') ? '✅' : '⬜'}</span>
                    <p className="text-[10px] text-slate-400">Avanzado</p>
                  </div>
                  <div className={`p-2 rounded-lg ${participantInfo.progression.completedLevels.includes('PL') ? 'bg-purple-500/20' : 'bg-slate-700/50'}`}>
                    <span className="text-lg">{participantInfo.progression.completedLevels.includes('PL') ? '✅' : '⬜'}</span>
                    <p className="text-[10px] text-slate-400">PL</p>
                  </div>
                </div>
                {participantInfo.progression.nextLevel && (
                  <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-xs text-yellow-400">
                      🎯 Siguiente nivel: <span className="font-bold">{participantInfo.progression.nextLevelName}</span>
                    </p>
                    {participantInfo.payment.pendingAmount > 0 && (
                      <p className="text-xs text-yellow-300 mt-1">
                        💰 Saldo pendiente: <span className="font-bold">{formatMoney(participantInfo.payment.pendingAmount)}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Cobro Form */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={cobroForm.amount}
                    onChange={(e) => setCobroForm({ ...cobroForm, amount: e.target.value })}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-green-500/50 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Producto</label>
                <select
                  value={cobroForm.visionId}
                  onChange={(e) => {
                    setCobroForm({ ...cobroForm, visionId: e.target.value, participanteId: '' });
                    setSelectedParticipante(null);
                    setSearchParticipante('');
                  }}
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-green-500/50 focus:outline-none"
                >
                  <option value="">General</option>
                  {/* Agrupar productos por organización */}
                  {Object.entries(
                    products.reduce((acc, p) => {
                      if (!acc[p.organizationName]) acc[p.organizationName] = [];
                      acc[p.organizationName].push(p);
                      return acc;
                    }, {} as Record<string, Product[]>)
                  ).map(([orgName, orgProducts]) => (
                    <optgroup key={orgName} label={`📍 ${orgName}`}>
                      {orgProducts.map(p => (
                        <option key={p.id} value={p.visionId || ''}>
                          {p.type === 'VISION' ? '🎯 ' : p.type === 'TRAINING' ? '🏋️ ' : p.type === 'WORKSHOP' ? '🛠️ ' : '📚 '}
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {/* Selector de Participante - Solo cuando hay visión seleccionada */}
            {cobroForm.visionId && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Participante (opcional)</label>
                {selectedParticipante ? (
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                        {selectedParticipante.nombre.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{selectedParticipante.nombre}</p>
                        <p className="text-xs text-slate-400">{selectedParticipante.email}</p>
                        {selectedParticipante.saldoPendiente !== undefined && selectedParticipante.saldoPendiente > 0 && (
                          <p className="text-xs text-yellow-400">Saldo pendiente: {formatMoney(selectedParticipante.saldoPendiente)}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedParticipante(null);
                        setCobroForm({ ...cobroForm, participanteId: '' });
                        setSearchParticipante('');
                      }}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={loadingParticipantes ? "Cargando participantes..." : "Buscar participante por nombre..."}
                      value={searchParticipante}
                      onChange={(e) => setSearchParticipante(e.target.value)}
                      disabled={loadingParticipantes}
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
                    />
                    {loadingParticipantes && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500/30 border-t-blue-500" />
                      </div>
                    )}
                    {/* Lista de participantes filtrados */}
                    {searchParticipante.length >= 1 && !loadingParticipantes && (
                      <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {participantes
                          .filter(p => 
                            p.nombre.toLowerCase().includes(searchParticipante.toLowerCase()) ||
                            p.email.toLowerCase().includes(searchParticipante.toLowerCase())
                          )
                          .slice(0, 10)
                          .map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedParticipante(p);
                                setCobroForm({ ...cobroForm, participanteId: p.id.toString(), reference: `Pago ${p.nombre}` });
                                setSearchParticipante('');
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-b-0 flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
                                {p.nombre.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
                                <p className="text-xs text-slate-400 truncate">{p.email}</p>
                              </div>
                              {p.saldoPendiente !== undefined && p.saldoPendiente > 0 && (
                                <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded">
                                  {formatMoney(p.saldoPendiente)}
                                </span>
                              )}
                            </button>
                          ))}
                        {participantes.filter(p => 
                          p.nombre.toLowerCase().includes(searchParticipante.toLowerCase()) ||
                          p.email.toLowerCase().includes(searchParticipante.toLowerCase())
                        ).length === 0 && (
                          <p className="px-3 py-2 text-slate-500 text-sm">No se encontraron participantes</p>
                        )}
                      </div>
                    )}
                    {/* Mostrar conteo de participantes */}
                    {!searchParticipante && participantes.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        {participantes.length} participante{participantes.length !== 1 ? 's' : ''} en esta visión
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Referencia</label>
              <input
                type="text"
                placeholder="Ej: Inscripción Juan Pérez"
                value={cobroForm.reference}
                onChange={(e) => setCobroForm({ ...cobroForm, reference: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-green-500/50 focus:outline-none"
              />
            </div>

            {/* Botón según modo de pago */}
            {paymentMode === 'cash' ? (
              <button
                onClick={handleGenerarCodigo}
                disabled={loading || !cobroForm.amount || !!activePOSTransaction}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <QrCode size={20} />
                    Generar Código de Cobro
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                {/* Selector de dispositivo POS */}
                {posDevices.length > 1 && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Terminal POS</label>
                    <select
                      value={selectedDevice}
                      onChange={(e) => setSelectedDevice(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-blue-500/50 focus:outline-none"
                    >
                      {posDevices.map(device => (
                        <option key={device.id} value={device.id}>
                          📱 {device.name || `Terminal ${device.id.slice(-4)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <button
                  onClick={handleSendToPOS}
                  disabled={loadingPOS || !cobroForm.amount || !selectedParticipante || !selectedDevice || !!activePOSTransaction}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  {loadingPOS ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Enviando a terminal...
                    </>
                  ) : (
                    <>
                      <CreditCard size={20} />
                      Enviar a Terminal POS
                    </>
                  )}
                </button>
                
                {!selectedParticipante && (
                  <p className="text-xs text-yellow-400 text-center">
                    ⚠️ Selecciona un participante para cobrar con tarjeta
                  </p>
                )}
                
                {posConfigured === false && (
                  <p className="text-xs text-red-400 text-center">
                    ❌ Terminal POS no configurada. Configura Mercado Pago Point en ajustes.
                  </p>
                )}
                
                {posConfigured === true && posDevices.length === 0 && (
                  <p className="text-xs text-red-400 text-center">
                    ❌ No hay terminales POS vinculadas. Vincula un dispositivo Point desde Mercado Pago.
                  </p>
                )}
              </div>
            )}

            {/* Recent Codes */}
            {recentCodes.length > 0 && (
              <div className="pt-3 border-t border-slate-700/50">
                <p className="text-xs text-slate-500 mb-2">Códigos recientes</p>
                <div className="space-y-2">
                  {recentCodes.slice(0, 3).map(code => {
                    const { canCancel } = canCancelCode(code);
                    return (
                      <div 
                        key={code.id}
                        className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg group"
                      >
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono text-green-400">{code.code}</code>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                            code.status === 'ACTIVE' ? 'bg-yellow-500/20 text-yellow-400' :
                            code.status === 'REDEEMED' ? 'bg-green-500/20 text-green-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {code.status === 'ACTIVE' ? 'Pendiente' : code.status === 'REDEEMED' ? 'Cobrado' : 'Cancelado'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-400">{formatMoney(code.amount)}</span>
                          {canCancel && (
                            <button
                              onClick={() => setShowCancelConfirm(code)}
                              className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
                              title="Cancelar código"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Expense Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-center">
                <Clock className="mx-auto text-yellow-400 mb-1" size={20} />
                <p className="text-xl font-bold text-yellow-400">{expenseSummary.pending}</p>
                <p className="text-[10px] text-slate-400">Pendientes</p>
              </div>
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                <CheckCircle className="mx-auto text-green-400 mb-1" size={20} />
                <p className="text-xl font-bold text-green-400">{expenseSummary.approved}</p>
                <p className="text-[10px] text-slate-400">Aprobados</p>
              </div>
            </div>

            {/* Gasto Form */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Concepto *</label>
              <input
                type="text"
                placeholder="Ej: Compra de materiales"
                value={gastoForm.concept}
                onChange={(e) => setGastoForm({ ...gastoForm, concept: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-red-500/50 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={gastoForm.amount}
                    onChange={(e) => setGastoForm({ ...gastoForm, amount: e.target.value })}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-red-500/50 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Categoría</label>
                <select
                  value={gastoForm.category}
                  onChange={(e) => setGastoForm({ ...gastoForm, category: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-red-500/50 focus:outline-none"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Producto (opcional)</label>
              <select
                value={gastoForm.visionId}
                onChange={(e) => setGastoForm({ ...gastoForm, visionId: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-red-500/50 focus:outline-none"
              >
                <option value="">General (sin producto)</option>
                {/* Agrupar productos por organización */}
                {Object.entries(
                  products.reduce((acc, p) => {
                    if (!acc[p.organizationName]) acc[p.organizationName] = [];
                    acc[p.organizationName].push(p);
                    return acc;
                  }, {} as Record<string, Product[]>)
                ).map(([orgName, orgProducts]) => (
                  <optgroup key={orgName} label={`📍 ${orgName}`}>
                    {orgProducts.map(p => (
                      <option key={p.id} value={p.visionId || ''}>
                        {p.type === 'VISION' ? '🎯 ' : p.type === 'TRAINING' ? '🏋️ ' : p.type === 'WORKSHOP' ? '🛠️ ' : '📚 '}
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <button
              onClick={handleRegistrarGasto}
              disabled={loading || !gastoForm.concept || !gastoForm.amount}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <Plus size={20} />
                  Registrar Gasto
                </>
              )}
            </button>

            {/* Link to full page */}
            <Link 
              href={isAdmin ? "/dashboard/school-admin/treasury/gastos" : "/dashboard/coordinador/treasury"}
              className="block text-center text-sm text-slate-400 hover:text-indigo-400 transition-colors"
            >
              Ver historial completo de gastos →
            </Link>
          </div>
        )}
      </div>
    </div>

    {/* MODAL DE CÓDIGO GENERADO - Estilo Nota de Compra Premium */}
    {showCodeModal && generatedCode && (
      <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto"
        onClick={() => setShowCodeModal(false)}
      >
        <div 
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border-2 max-w-md w-full shadow-2xl my-8"
          style={{ 
            borderColor: `${orgInfo.brandColor}50`,
            boxShadow: `0 25px 50px -12px ${orgInfo.brandColor}30`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Premium con color de organización */}
          <div 
            className="p-4 border-b flex items-center justify-between"
            style={{ 
              borderColor: `${orgInfo.brandColor}30`,
              background: `linear-gradient(to right, ${orgInfo.brandColor}20, transparent)`
            }}
          >
            <div className="flex items-center gap-3">
              {orgInfo.logoUrl ? (
                <img 
                  src={orgInfo.logoUrl} 
                  alt={orgInfo.nombre}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${orgInfo.brandColor}30` }}
                >
                  <Receipt style={{ color: orgInfo.brandColor }} size={24} />
                </div>
              )}
              <div>
                <h3 className="text-xl font-black" style={{ color: orgInfo.brandColor }}>
                  Codigo de Referencia
                </h3>
                <p className="text-xs text-slate-400">Comprobante de cobro generado</p>
              </div>
            </div>
            <button
              onClick={() => setShowCodeModal(false)}
              className="text-slate-400 hover:text-white transition-colors p-2"
            >
              <X size={24} />
            </button>
          </div>

          {/* Contenido - Nota de Compra */}
          <div className="p-6">
            {/* Recibo Visual */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden">
              {/* Header del recibo con color de organización */}
              <div 
                className="p-4 text-center"
                style={{ 
                  background: `linear-gradient(to right, ${orgInfo.brandColor}, ${orgInfo.brandColor}CC)`
                }}
              >
                {orgInfo.logoUrl ? (
                  <img 
                    src={orgInfo.logoUrl} 
                    alt={orgInfo.nombre}
                    className="w-16 h-16 mx-auto mb-2 rounded-xl object-cover border-2 border-white/30"
                  />
                ) : (
                  <div className="text-3xl mb-1">💰</div>
                )}
                <h4 className="text-white font-bold text-lg">CODIGO DE REFERENCIA</h4>
                <p className="text-white/80 text-xs">{orgInfo.nombre}</p>
              </div>

              {/* Línea decorativa perforada */}
              <div className="flex justify-center -my-2 relative z-10">
                <div className="flex gap-1">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-slate-900" />
                  ))}
                </div>
              </div>

              {/* Código Principal */}
              <div className="p-6 text-center">
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Referencia</p>
                <div className="relative">
                  <code 
                    className="text-3xl md:text-4xl font-mono font-black tracking-[0.15em] block py-4 px-2 rounded-xl border-2 border-dashed"
                    style={{ 
                      color: orgInfo.brandColor,
                      backgroundColor: `${orgInfo.brandColor}15`,
                      borderColor: `${orgInfo.brandColor}40`
                    }}
                  >
                    {generatedCode.code}
                  </code>
                  {copied && (
                    <div 
                      className="absolute -top-2 -right-2 text-white text-xs px-2 py-1 rounded-full animate-bounce"
                      style={{ backgroundColor: orgInfo.brandColor }}
                    >
                      ¡Copiado!
                    </div>
                  )}
                </div>

                {/* Monto Destacado */}
                <div 
                  className="mt-6 p-4 rounded-xl border"
                  style={{ 
                    background: `linear-gradient(to right, ${orgInfo.brandColor}20, ${orgInfo.brandColor}10)`,
                    borderColor: `${orgInfo.brandColor}30`
                  }}
                >
                  <p className="text-xs text-slate-400 mb-1">MONTO A REDIMIR</p>
                  <p className="text-4xl font-black text-white">
                    {formatMoney(generatedCode.amount)}
                  </p>
                </div>

                {/* Detalles */}
                <div className="mt-4 space-y-3 text-left">
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400 text-sm">📝 Concepto</span>
                    <span className="text-white font-medium text-sm text-right max-w-[60%] truncate">
                      {generatedCode.reference}
                    </span>
                  </div>
                  {generatedCode.visionName && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                      <span className="text-slate-400 text-sm">🎯 Visión</span>
                      <span className="text-white font-medium text-sm">{generatedCode.visionName}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400 text-sm">📅 Generado</span>
                    <span className="text-white font-medium text-sm">
                      {formatDate(generatedCode.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-400 text-sm">📊 Estado</span>
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/30">
                      PENDIENTE
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer del recibo */}
              <div 
                className="p-4 text-center border-t border-slate-700/50"
                style={{ backgroundColor: `${orgInfo.brandColor}10` }}
              >
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Presente esta referencia al momento del pago
                </p>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => copyCode(generatedCode.code)}
                className="flex-1 px-4 py-4 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Copy size={20} />
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
              <button
                onClick={shareCode}
                className="flex-1 px-4 py-4 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                style={{ 
                  background: `linear-gradient(to right, ${orgInfo.brandColor}, ${orgInfo.brandColor}CC)`,
                  boxShadow: `0 10px 25px -5px ${orgInfo.brandColor}40`
                }}
              >
                <Share2 size={20} />
                Compartir
              </button>
            </div>

            {/* Tip */}
            <div 
              className="mt-4 p-3 rounded-xl border"
              style={{ 
                background: `linear-gradient(to right, ${orgInfo.brandColor}10, ${orgInfo.brandColor}05)`,
                borderColor: `${orgInfo.brandColor}20`
              }}
            >
              <p className="text-slate-300/80 text-xs text-center">
                💡 La referencia será válida hasta que sea canjeada o cancelada
              </p>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* MODAL DE CONFIRMACIÓN DE CANCELACIÓN */}
    {showCancelConfirm && (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={() => setShowCancelConfirm(null)}
      >
        <div 
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-red-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-red-500/20 bg-gradient-to-r from-red-900/30 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/20 rounded-full">
                <Ban className="text-red-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Cancelar Código</h3>
                <p className="text-xs text-slate-400">Esta acción no se puede deshacer</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Código:</span>
                <code className="text-red-400 font-mono font-bold">{showCancelConfirm.code}</code>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Monto:</span>
                <span className="text-white font-bold">{formatMoney(showCancelConfirm.amount)}</span>
              </div>
              {showCancelConfirm.reference && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Referencia:</span>
                  <span className="text-slate-300 text-sm">{showCancelConfirm.reference}</span>
                </div>
              )}
            </div>

              <p className="text-slate-400 text-sm text-center mb-4">
                ¿Estás seguro de que deseas cancelar este código de pago?
              </p>
              
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                <p className="text-amber-400 text-xs text-center">
                  ⚠️ Se notificará al administrador sobre esta cancelación
                </p>
              </div>            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(null)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
              >
                No, mantener
              </button>
              <button
                onClick={() => handleCancelCode(showCancelConfirm)}
                disabled={cancellingCode === showCancelConfirm.code}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {cancellingCode === showCancelConfirm.code ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <Trash2 size={18} />
                    Sí, cancelar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
