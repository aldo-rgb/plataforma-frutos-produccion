'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Wallet, Receipt, Plus, DollarSign, 
  CheckCircle, Clock, AlertTriangle, X,
  Copy, QrCode, ArrowRight, Banknote, Share2, Download, Trash2, Ban,
  CreditCard, Smartphone, Loader2, Wifi, WifiOff, Users
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

interface PaymentCode {
  id: number;
  code: string;
  amount: number;
  reference: string;
  status: 'ACTIVE' | 'REDEEMED' | 'CANCELLED';
  createdAt: string;
  visionName?: string;
  ticketId?: string;
  participantName?: string;
  ticketLevel?: string;
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
    currentLevel?: string;
    currentLevelName?: string;
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

interface PriceOption {
  label: string;
  amount: number;
  description: string;
  type: string;
}

interface OrganizationPrices {
  BASIC: PriceOption[];
  ADVANCED: PriceOption[];
  PL: PriceOption[];
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
  
  // Búsqueda global de usuarios (quien invita)
  const [globalSearchResults, setGlobalSearchResults] = useState<Participante[]>([]);
  const [loadingGlobalSearch, setLoadingGlobalSearch] = useState(false);
  
  // Nuevo flujo de cobro: Nivel y opciones de precio
  const [selectedLevel, setSelectedLevel] = useState<'BASIC' | 'ADVANCED' | 'PL' | ''>('');
  const [organizationPrices, setOrganizationPrices] = useState<OrganizationPrices | null>(null);
  const [selectedPriceOption, setSelectedPriceOption] = useState<PriceOption | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  
  // Form para nuevo usuario (pago Básico - el padrino invita a alguien nuevo)
  const [newUserForm, setNewUserForm] = useState({
    nombre: '',
    fechaNacimiento: '',
    email: '',
    telefono: ''
  });
  
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
  
  // Modal de estado del pago con tarjeta
  const [showPOSStatusModal, setShowPOSStatusModal] = useState(false);
  const [posPaymentStatus, setPosPaymentStatus] = useState<{
    stage: 'sending' | 'waiting' | 'processing' | 'approved' | 'registering' | 'completed' | 'error' | 'cancelled';
    message: string;
    paymentIntentId?: string;
    error?: string;
    confirmationCode?: string;
    amount?: number;
    participantName?: string;
    visionName?: string;
    isCombo?: boolean;
    ticketId?: string;
    ticketLevel?: string;
    organizationName?: string;
  }>({ stage: 'sending', message: 'Enviando a terminal...' });

  useEffect(() => {
    fetchInitialData();
    // Cargar dispositivos POS al inicio
    fetchPOSDevices();
    // Cargar precios de la organización
    fetchOrganizationPrices();
  }, []);

  // Cargar participantes cuando se selecciona una visión
  useEffect(() => {
    if (cobroForm.visionId) {
      fetchParticipantes(cobroForm.visionId);
      // Resetear selección de nivel y precio al cambiar visión
      setSelectedLevel('');
      setSelectedPriceOption(null);
      setCobroForm(prev => ({ ...prev, amount: '', reference: '' }));
    } else {
      setParticipantes([]);
      setSelectedParticipante(null);
      setSearchParticipante('');
      setSelectedLevel('');
      setSelectedPriceOption(null);
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

  // Actualizar monto cuando se selecciona una opción de precio
  useEffect(() => {
    if (selectedPriceOption) {
      const levelName = selectedLevel === 'BASIC' ? 'Básico' : selectedLevel === 'ADVANCED' ? 'Avanzado' : 'Liderato';
      
      // Para Básico: usar nombre del nuevo usuario (invitado)
      // Para otros niveles: usar nombre del participante seleccionado
      let personName = '';
      if (selectedLevel === 'BASIC' && newUserForm.nombre) {
        personName = newUserForm.nombre;
      } else if (selectedParticipante) {
        personName = selectedParticipante.nombre;
      }
      
      setCobroForm(prev => ({
        ...prev,
        amount: selectedPriceOption.amount.toString(),
        reference: personName 
          ? `${selectedPriceOption.description} - ${personName}`
          : `${selectedPriceOption.description}`
      }));
    }
  }, [selectedPriceOption, selectedParticipante, selectedLevel, newUserForm.nombre]);

  // Cargar precios de la organización
  const fetchOrganizationPrices = async () => {
    setLoadingPrices(true);
    try {
      const res = await fetch('/api/treasury/organization-prices');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.priceOptions) {
          setOrganizationPrices(data.priceOptions);
        }
      }
    } catch (error) {
      console.error('Error fetching organization prices:', error);
    } finally {
      setLoadingPrices(false);
    }
  };

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

  // Búsqueda global de usuarios en toda la organización (para "quien invita")
  const searchUsersGlobally = async (query: string) => {
    if (query.length < 2) {
      setGlobalSearchResults([]);
      return;
    }
    setLoadingGlobalSearch(true);
    try {
      const res = await fetch(`/api/treasury/search-users?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setGlobalSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users globally:', error);
    } finally {
      setLoadingGlobalSearch(false);
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
    // Los dispositivos de MP Point tienen formatos como: 
    // - "PAX_A910__SMARTPOS1234567890"
    // - "DSPREAD_D20__1209860452112113745" (lectores Bluetooth D20)
    // - "NEWLAND_N950__N950NCC805297551" (terminales Newland)
    // - IDs numéricos largos
    return deviceId.includes('PAX') || deviceId.includes('SMARTPOS') || deviceId.includes('DSPREAD') || deviceId.includes('NEWLAND') || /^\d{10,}$/.test(deviceId);
  };

  // Enviar cobro a terminal POS (Mercado Pago Point o Stripe)
  const handleSendToPOS = async () => {
    console.log('[TreasuryPOS] handleSendToPOS llamado');
    console.log('[TreasuryPOS] selectedDevice:', selectedDevice);
    console.log('[TreasuryPOS] cobroForm.amount:', cobroForm.amount);
    console.log('[TreasuryPOS] selectedParticipante:', selectedParticipante);
    
    if (!selectedDevice || !cobroForm.amount || parseFloat(cobroForm.amount) <= 0) {
      console.log('[TreasuryPOS] Validación fallida - dispositivo o monto inválido');
      showNotification('error', 'Selecciona un dispositivo y monto válido');
      return;
    }

    if (!selectedParticipante) {
      console.log('[TreasuryPOS] Validación fallida - sin participante');
      showNotification('error', 'Selecciona un participante para cobrar con tarjeta');
      return;
    }

    // Para BÁSICO: validar datos del nuevo usuario
    if (selectedLevel === 'BASIC') {
      if (!newUserForm.nombre || !newUserForm.email || !newUserForm.telefono) {
        showNotification('error', 'Completa los datos del nuevo participante');
        return;
      }
    }

    // Mostrar modal de estado
    setShowPOSStatusModal(true);
    setPosPaymentStatus({ stage: 'sending', message: 'Enviando cobro a terminal...' });

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
        
        // Actualizar modal a estado "esperando"
        setPosPaymentStatus({ 
          stage: 'waiting', 
          message: 'Esperando pago en terminal...', 
          paymentIntentId: data.paymentIntent.id 
        });
        
        // Iniciar polling para verificar estado del pago
        if (useMercadoPago) {
          startPaymentStatusPolling(data.paymentIntent.id);
        }
      } else {
        setPosPaymentStatus({ stage: 'error', message: 'Error al enviar a terminal', error: data.error });
        showNotification('error', data.error || 'Error al enviar a terminal');
      }
    } catch (error) {
      setPosPaymentStatus({ stage: 'error', message: 'Error de conexión', error: 'Error de conexión con terminal' });
      showNotification('error', 'Error de conexión con terminal');
    } finally {
      setLoadingPOS(false);
    }
  };

  // Función para registrar usuario después de pago aprobado (BÁSICO)
  const registerUserAfterPayment = async (): Promise<{ 
    success: boolean; 
    visionName?: string; 
    isCombo?: boolean; 
    isApartado?: boolean;
    pendingDebt?: number;
    ticketsCreated?: number; 
    paymentCode?: { code: string; amount: number; reference: string };
    ticketId?: string;
    ticketLevel?: string;
    error?: string 
  }> => {
    // Si es AVANZADO, registrar con la API de avanzado
    if (selectedLevel === 'ADVANCED') {
      if (!selectedParticipante || !cobroForm.visionId) {
        return { success: false, error: 'Faltan datos del participante o visión' };
      }
      
      const priceType = selectedPriceOption?.type || 'ADVANCED';
      
      try {
        const registerRes = await fetch('/api/treasury/register-advanced', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: selectedParticipante.userId || selectedParticipante.id,
            visionId: parseInt(cobroForm.visionId),
            amount: parseFloat(cobroForm.amount),
            priceType: priceType,
            paymentMethod: 'CARD'
          })
        });
        
        const registerData = await registerRes.json();
        
        if (!registerData.success) {
          return { success: false, error: registerData.error || 'Error al registrar pago de Avanzado' };
        }
        
        return {
          success: true,
          visionName: registerData.enrollment?.visionName || 'Avanzado',
          isCombo: registerData.isCombo,
          isApartado: registerData.isApartado,
          pendingDebt: registerData.pendingDebt,
          ticketsCreated: registerData.ticketsCreated || 1,
          ticketId: registerData.enrollment?.ticketId,
          ticketLevel: 'ADVANCED',
          paymentCode: registerData.paymentCode ? {
            code: registerData.paymentCode.code,
            amount: registerData.paymentCode.amount,
            reference: registerData.paymentCode.reference
          } : undefined
        };
      } catch (error) {
        return { success: false, error: 'Error de conexión al registrar Avanzado' };
      }
    }
    
    // Si es PL (Liderato), registrar con la API de PL
    if (selectedLevel === 'PL') {
      if (!selectedParticipante || !cobroForm.visionId) {
        return { success: false, error: 'Faltan datos del participante o visión' };
      }
      
      const priceType = selectedPriceOption?.type || 'PL';
      
      try {
        const registerRes = await fetch('/api/treasury/register-pl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: selectedParticipante.userId || selectedParticipante.id,
            visionId: parseInt(cobroForm.visionId),
            amount: parseFloat(cobroForm.amount),
            priceType: priceType,
            paymentMethod: 'CARD'
          })
        });
        
        const registerData = await registerRes.json();
        
        if (!registerData.success) {
          return { success: false, error: registerData.error || 'Error al registrar pago de Liderato' };
        }
        
        return {
          success: true,
          visionName: registerData.enrollment?.visionName || 'Liderato',
          isUpgrade: registerData.isUpgrade,
          ticketsCreated: registerData.ticketsCreated || 1,
          ticketId: registerData.ticket?.id || registerData.enrollment?.ticketId,
          ticketLevel: 'PL',
          paymentCode: registerData.paymentCode ? {
            code: registerData.paymentCode.code,
            amount: registerData.paymentCode.amount,
            reference: registerData.paymentCode.reference
          } : undefined
        };
      } catch (error) {
        return { success: false, error: 'Error de conexión al registrar Liderato' };
      }
    }
    
    // Si es BÁSICO, registrar con la API existente
    if (selectedLevel === 'BASIC') {
      const isCombo = selectedPriceOption?.type?.includes('COMBO') || false;
      
      try {
        const registerRes = await fetch('/api/treasury/register-basic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: newUserForm.nombre,
            email: newUserForm.email,
            telefono: newUserForm.telefono,
            fechaNacimiento: newUserForm.fechaNacimiento || null,
            padrinoId: selectedParticipante?.userId || selectedParticipante?.id,
            amount: parseFloat(cobroForm.amount),
            priceType: isCombo ? 'COMBO' : 'BASIC',
            paymentMethod: 'CARD'
          })
        });
        
        const registerData = await registerRes.json();
        
        if (!registerData.success) {
          return { success: false, error: registerData.error || 'Error al registrar participante' };
        }
        
        return { 
          success: true, 
          visionName: registerData.enrollment?.visionName || 'Básico',
          isCombo: registerData.isCombo,
          ticketsCreated: registerData.ticketsCreated || 1,
          ticketId: registerData.enrollment?.ticketId,
          ticketLevel: registerData.isCombo ? 'COMBO' : 'BASIC',
          paymentCode: registerData.paymentCode ? {
            code: registerData.paymentCode.code,
            amount: registerData.paymentCode.amount,
            reference: registerData.paymentCode.reference
          } : undefined
        };
      } catch (error) {
        return { success: false, error: 'Error de conexión al registrar' };
      }
    }
    
    // Para otros niveles, no hay que registrar aún
    return { success: true };
  };

  // Polling para verificar estado del pago en Mercado Pago Point
  const startPaymentStatusPolling = (paymentIntentId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/treasury/mercadopago-point?action=status&paymentIntentId=${paymentIntentId}`);
        if (res.ok) {
          const data = await res.json();
          const state = data.paymentIntent?.state;
          const payment = data.paymentIntent?.payment;
          const paymentStatus = payment?.status?.toLowerCase(); // Normalizar a minúsculas
          
          // Log para debugging
          console.log('[POS Polling] State:', state, 'Payment:', payment, 'PaymentStatus:', paymentStatus);
          
          // IMPORTANTE: FINISHED solo significa que la intención terminó
          // Debemos verificar payment.status para saber si fue aprobado o rechazado
          if (state === 'FINISHED') {
            clearInterval(pollInterval);
            
            // Verificar si el pago fue realmente aprobado
            // MercadoPago puede devolver 'approved', 'APPROVED', o el pago puede existir sin status explícito
            const isApproved = paymentStatus === 'approved' || 
                               payment?.status === 'APPROVED' || 
                               (payment && payment.id && !paymentStatus); // Si hay payment.id pero no status, asumir aprobado
            
            if (isApproved || (payment && payment.id)) {
              // Pago APROBADO - proceder con registro
              setPosPaymentStatus({ stage: 'approved', message: '¡Pago recibido!' });
              setActivePOSTransaction(prev => prev ? { ...prev, status: 'APPROVED' } : null);
            
            // Si es BÁSICO, registrar al nuevo usuario
            if (selectedLevel === 'BASIC') {
              setPosPaymentStatus({ stage: 'registering', message: 'Registrando participante...' });
              
              const registerResult = await registerUserAfterPayment();
              
              if (registerResult.success) {
                const successMsg = registerResult.isCombo 
                  ? `¡${newUserForm.nombre} registrado FULL!`
                  : `¡${newUserForm.nombre} registrado!`;
                
                setPosPaymentStatus({ 
                  stage: 'completed', 
                  message: successMsg,
                  confirmationCode: registerResult.paymentCode?.code,
                  amount: registerResult.paymentCode?.amount || parseFloat(cobroForm.amount),
                  participantName: newUserForm.nombre,
                  visionName: registerResult.visionName,
                  isCombo: registerResult.isCombo,
                  ticketId: registerResult.ticketId,
                  ticketLevel: registerResult.ticketLevel,
                  organizationName: orgInfo.name
                });
                
                showNotification('success', successMsg);
              } else {
                setPosPaymentStatus({ 
                  stage: 'error', 
                  message: 'Pago recibido pero error al registrar', 
                  error: registerResult.error 
                });
                showNotification('error', `Pago OK pero error al registrar: ${registerResult.error}`);
              }
            } 
            // Si es AVANZADO, registrar pago con la nueva API
            else if (selectedLevel === 'ADVANCED') {
              setPosPaymentStatus({ stage: 'registering', message: 'Registrando inscripción...' });
              
              const registerResult = await registerUserAfterPayment();
              
              if (registerResult.success) {
                let successMsg = `¡${selectedParticipante?.nombre} inscrito en Avanzado!`;
                if (registerResult.isApartado) {
                  successMsg = `¡Apartado registrado! Deuda: $${registerResult.pendingDebt?.toLocaleString()}`;
                } else if (registerResult.isCombo) {
                  successMsg = `¡${selectedParticipante?.nombre} inscrito Combo Avanzado+PL!`;
                }
                
                setPosPaymentStatus({ 
                  stage: 'completed', 
                  message: successMsg,
                  confirmationCode: registerResult.paymentCode?.code,
                  amount: registerResult.paymentCode?.amount || parseFloat(cobroForm.amount),
                  participantName: selectedParticipante?.nombre || '',
                  visionName: registerResult.visionName,
                  isCombo: registerResult.isCombo,
                  ticketId: registerResult.ticketId,
                  ticketLevel: registerResult.ticketLevel,
                  organizationName: orgInfo.name
                });
                
                showNotification('success', successMsg);
              } else {
                setPosPaymentStatus({ 
                  stage: 'error', 
                  message: 'Pago recibido pero error al registrar', 
                  error: registerResult.error 
                });
                showNotification('error', `Pago OK pero error al registrar: ${registerResult.error}`);
              }
            }
            // Si es PL (Liderato), registrar pago
            else if (selectedLevel === 'PL') {
              setPosPaymentStatus({ stage: 'registering', message: 'Registrando inscripción...' });
              
              const registerResult = await registerUserAfterPayment();
              
              if (registerResult.success) {
                let successMsg = `¡${selectedParticipante?.nombre} inscrito en Liderato!`;
                if (registerResult.isUpgrade) {
                  successMsg = `¡Upgrade a Combo completado para ${selectedParticipante?.nombre}!`;
                }
                
                setPosPaymentStatus({ 
                  stage: 'completed', 
                  message: successMsg,
                  confirmationCode: registerResult.paymentCode?.code,
                  amount: registerResult.paymentCode?.amount || parseFloat(cobroForm.amount),
                  participantName: selectedParticipante?.nombre || '',
                  visionName: registerResult.visionName,
                  isCombo: false,
                  ticketId: registerResult.ticketId,
                  ticketLevel: registerResult.ticketLevel,
                  organizationName: orgInfo.name
                });
                
                showNotification('success', successMsg);
              } else {
                setPosPaymentStatus({ 
                  stage: 'error', 
                  message: 'Pago recibido pero error al registrar', 
                  error: registerResult.error 
                });
                showNotification('error', `Pago OK pero error al registrar: ${registerResult.error}`);
              }
            } else {
              // Otros niveles: solo mostrar éxito del pago
              setPosPaymentStatus({ stage: 'completed', message: '¡Pago completado exitosamente!' });
              showNotification('success', '✅ ¡Pago aprobado!');
            }
            
            // Limpiar después de 4 segundos
            setTimeout(() => {
              setActivePOSTransaction(null);
              setCobroForm({ amount: '', reference: '', visionId: '', participanteId: '' });
              setSelectedParticipante(null);
              setSearchParticipante('');
              setSelectedLevel('');
              setSelectedPriceOption(null);
              setNewUserForm({ nombre: '', fechaNacimiento: '', email: '', telefono: '' });
              fetchInitialData();
              // No cerrar modal automáticamente - usuario lo cierra
            }, 4000);
            
            } else {
              // FINISHED pero NO hay evidencia de pago aprobado = mostrar advertencia
              console.warn('[POS] Pago FINISHED pero sin confirmación de aprobación:', data.paymentIntent);
              const rejectReason = payment?.status_detail || payment?.status || 'Estado desconocido';
              setPosPaymentStatus({ 
                stage: 'error', 
                message: 'Verificar Pago',
                error: `Verificar en MercadoPago: ${rejectReason}`
              });
              setActivePOSTransaction(prev => prev ? { ...prev, status: 'ERROR' } : null);
              showNotification('warning', `⚠️ Verificar pago manualmente - Estado: ${rejectReason}`);
              
              // Limpiar después de 5 segundos para permitir reintentar
              setTimeout(() => {
                setActivePOSTransaction(null);
                setShowPOSStatusModal(false);
                setPosPaymentStatus({ stage: 'idle', message: '' });
              }, 5000);
            }
            
          } else if (state === 'CANCELED' || state === 'ERROR' || state === 'REJECTED') {
            clearInterval(pollInterval);
            let errorMsg = 'Error en el pago';
            let errorDetail = '';
            
            if (state === 'CANCELED') {
              errorMsg = 'Pago Cancelado';
              errorDetail = 'El pago fue cancelado en la terminal';
            } else if (state === 'REJECTED') {
              errorMsg = 'Pago Rechazado';
              errorDetail = 'La tarjeta fue rechazada. Intenta con otra tarjeta.';
            } else {
              errorMsg = 'Error en el Pago';
              errorDetail = 'Ocurrió un error al procesar el pago';
            }
            
            setPosPaymentStatus({ 
              stage: state === 'CANCELED' ? 'cancelled' : 'error', 
              message: errorMsg,
              error: errorDetail
            });
            setActivePOSTransaction(prev => prev ? { ...prev, status: state === 'CANCELED' ? 'CANCELLED' : 'ERROR' } : null);
            showNotification('error', `${errorMsg}: ${errorDetail}`);
            
            // Limpiar después de 5 segundos para permitir reintentar
            setTimeout(() => {
              setActivePOSTransaction(null);
              setShowPOSStatusModal(false);
              setPosPaymentStatus({ stage: 'idle', message: '' });
            }, 5000);
          }
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    }, 3000); // Verificar cada 3 segundos

    // Detener polling después de 5 minutos
    setTimeout(() => {
      clearInterval(pollInterval);
      // Si aún está esperando, mostrar timeout
      if (posPaymentStatus.stage === 'waiting') {
        setPosPaymentStatus({ stage: 'error', message: 'Tiempo de espera agotado', error: 'No se recibió respuesta de la terminal' });
      }
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
      // Fetch visiones asignadas al coordinador (más específico que products)
      const visionesRes = await fetch('/api/coordinador/visiones');
      if (visionesRes.ok) {
        const data = await visionesRes.json();
        // La API devuelve { success: true, visiones: [...] }
        const visionesArray = data.visiones || data || [];
        // Filtrar solo visiones activas
        const visionesActivas = Array.isArray(visionesArray) 
          ? visionesArray.filter((v: any) => v.isActive !== false)
          : [];
        setVisiones(visionesActivas.map((v: any) => ({
          id: v.id,
          nombre: v.nombre,
          organizationName: v.Organization?.name || v.organizationName
        })));
      }

      // Fetch products from all organizations in the same Master Organization
      const productsRes = await fetch('/api/treasury/products');
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
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

  // Función para generar código de pago
  // Para BASIC: primero registra nuevo usuario con padrino, luego genera código
  // Para ADVANCED: registra pago de avanzado con ticket y enrollment
  // Para otros niveles: genera código de pago directamente
  const handleGenerarCodigo = async () => {
    if (!cobroForm.amount || parseFloat(cobroForm.amount) <= 0) {
      showNotification('error', 'Ingresa un monto válido');
      return;
    }

    setLoading(true);
    try {
      let participanteId = cobroForm.participanteId || null;
      let reference = cobroForm.reference;
      
      // Si es pago BÁSICO, primero registrar al nuevo usuario
      if (selectedLevel === 'BASIC') {
        // Validar datos del nuevo usuario
        if (!newUserForm.nombre || !newUserForm.email || !newUserForm.telefono) {
          showNotification('error', 'Completa los datos del nuevo participante');
          setLoading(false);
          return;
        }
        
        // Determinar si es COMBO basado en el tipo de precio seleccionado
        const isCombo = selectedPriceOption?.type?.includes('COMBO') || false;
        
        // Registrar nuevo usuario con padrino
        const registerRes = await fetch('/api/treasury/register-basic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: newUserForm.nombre,
            email: newUserForm.email,
            telefono: newUserForm.telefono,
            fechaNacimiento: newUserForm.fechaNacimiento || null,
            // NO enviamos visionId - la API busca automáticamente la próxima visión Básico vigente
            padrinoId: selectedParticipante?.userId || selectedParticipante?.id, // El participante seleccionado es el padrino
            amount: parseFloat(cobroForm.amount),
            priceType: isCombo ? 'COMBO' : 'BASIC' // Indicar si es combo para crear los 3 niveles
          })
        });
        
        const registerData = await registerRes.json();
        
        if (!registerData.success) {
          showNotification('error', registerData.error || 'Error al registrar nuevo participante');
          setLoading(false);
          return;
        }
        
        // Usar el ID del nuevo usuario para el pago
        participanteId = registerData.usuario?.id || registerData.enrollment?.userId || null;
        const visionRegistrada = registerData.enrollment?.visionName || 'Básico';
        const isComboRegistro = registerData.isCombo || false;
        const ticketsCreated = registerData.ticketsCreated || 1;
        
        // Para BÁSICO/COMBO: El registro ya está completo y el PaymentCode ya está REDEEMED
        // Mostrar modal de confirmación directamente sin crear otro código
        const paymentCodeInfo = registerData.paymentCode;
        
        // Referencia según tipo de registro
        const referenceText = isComboRegistro 
          ? `Full (B+A+L) - ${newUserForm.nombre}`
          : `Inscripción Básico - ${newUserForm.nombre}`;
        
        setGeneratedCode({ 
          id: paymentCodeInfo?.id || 'confirmed',
          code: paymentCodeInfo?.code || 'REGISTRO-COMPLETADO',
          amount: Number(paymentCodeInfo?.amount) || parseFloat(cobroForm.amount),
          reference: referenceText,
          status: 'REDEEMED', // Ya confirmado
          createdAt: new Date().toISOString(),
          visionName: visionRegistrada,
          ticketId: registerData.enrollment?.ticketId,
          participantName: newUserForm.nombre,
          ticketLevel: isComboRegistro ? 'FULL' : 'BASIC'
        });
        
        setShowCodeModal(true);
        
        // Mensaje según tipo
        const successMsg = isComboRegistro
          ? `¡${newUserForm.nombre} registrado FULL (${ticketsCreated} tickets) en ${visionRegistrada}!`
          : `¡${newUserForm.nombre} registrado en ${visionRegistrada}!`;
        showNotification('success', successMsg);
        
        // Limpiar formularios
        setCobroForm({ amount: '', reference: '', visionId: '', participanteId: '' });
        setSelectedParticipante(null);
        setSearchParticipante('');
        setSelectedLevel('');
        setSelectedPriceOption(null);
        setNewUserForm({ nombre: '', fechaNacimiento: '', email: '', telefono: '' });
        
        fetchInitialData();
        setLoading(false);
        return; // 🛑 SALIR - No generar otro código
      }
      
      // Si es pago AVANZADO, registrar con la nueva API
      if (selectedLevel === 'ADVANCED') {
        if (!selectedParticipante) {
          showNotification('error', 'Selecciona un participante');
          setLoading(false);
          return;
        }
        
        if (!cobroForm.visionId) {
          showNotification('error', 'Selecciona una visión');
          setLoading(false);
          return;
        }
        
        const priceType = selectedPriceOption?.type || 'ADVANCED';
        
        const registerRes = await fetch('/api/treasury/register-advanced', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: selectedParticipante.userId || selectedParticipante.id,
            visionId: parseInt(cobroForm.visionId),
            amount: parseFloat(cobroForm.amount),
            priceType: priceType,
            paymentMethod: 'CASH'
          })
        });
        
        const registerData = await registerRes.json();
        
        if (!registerData.success) {
          showNotification('error', registerData.error || 'Error al registrar pago de Avanzado');
          setLoading(false);
          return;
        }
        
        const paymentCodeInfo = registerData.paymentCode;
        const isComboRegistro = registerData.isCombo || false;
        const isApartado = registerData.isApartado || false;
        const pendingDebt = registerData.pendingDebt || 0;
        const visionRegistrada = registerData.enrollment?.visionName || 'Avanzado';
        
        setGeneratedCode({ 
          id: paymentCodeInfo?.id || 'confirmed',
          code: paymentCodeInfo?.code || 'REGISTRO-COMPLETADO',
          amount: Number(paymentCodeInfo?.amount) || parseFloat(cobroForm.amount),
          reference: paymentCodeInfo?.reference || `Avanzado - ${selectedParticipante.nombre}`,
          status: 'REDEEMED',
          createdAt: new Date().toISOString(),
          visionName: visionRegistrada,
          ticketId: registerData.enrollment?.ticketId || registerData.ticket?.id,
          participantName: selectedParticipante.nombre,
          ticketLevel: isComboRegistro ? 'COMBO' : 'ADVANCED'
        });
        
        setShowCodeModal(true);
        
        // Mensaje según tipo
        let successMsg = `¡${selectedParticipante.nombre} inscrito en Avanzado - ${visionRegistrada}!`;
        if (isApartado) {
          successMsg = `¡Apartado registrado para ${selectedParticipante.nombre}! Deuda pendiente: $${pendingDebt.toLocaleString()}`;
        } else if (isComboRegistro) {
          successMsg = `¡${selectedParticipante.nombre} inscrito en Combo Avanzado+PL - ${visionRegistrada}!`;
        }
        showNotification('success', successMsg);
        
        // Limpiar formularios
        setCobroForm({ amount: '', reference: '', visionId: '', participanteId: '' });
        setSelectedParticipante(null);
        setSearchParticipante('');
        setSelectedLevel('');
        setSelectedPriceOption(null);
        
        fetchInitialData();
        setLoading(false);
        return; // 🛑 SALIR
      }
      
      // Si es pago PL (Liderato), registrar con la nueva API
      if (selectedLevel === 'PL') {
        if (!selectedParticipante) {
          showNotification('error', 'Selecciona un participante');
          setLoading(false);
          return;
        }
        
        if (!cobroForm.visionId) {
          showNotification('error', 'Selecciona una visión');
          setLoading(false);
          return;
        }
        
        const priceType = selectedPriceOption?.type || 'PL';
        
        const registerRes = await fetch('/api/treasury/register-pl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: selectedParticipante.userId || selectedParticipante.id,
            visionId: parseInt(cobroForm.visionId),
            amount: parseFloat(cobroForm.amount),
            priceType: priceType,
            paymentMethod: 'CASH'
          })
        });
        
        const registerData = await registerRes.json();
        
        if (!registerData.success) {
          showNotification('error', registerData.error || 'Error al registrar pago de Liderato');
          setLoading(false);
          return;
        }
        
        const paymentCodeInfo = registerData.paymentCode;
        const isUpgrade = registerData.isUpgrade || false;
        const visionRegistrada = registerData.enrollment?.visionName || 'Liderato';
        
        setGeneratedCode({ 
          id: paymentCodeInfo?.id || 'confirmed',
          code: paymentCodeInfo?.code || 'REGISTRO-COMPLETADO',
          amount: Number(paymentCodeInfo?.amount) || parseFloat(cobroForm.amount),
          reference: paymentCodeInfo?.reference || `Liderato - ${selectedParticipante.nombre}`,
          status: 'REDEEMED',
          createdAt: new Date().toISOString(),
          visionName: visionRegistrada,
          ticketId: registerData.enrollment?.ticketId || registerData.ticket?.id,
          participantName: selectedParticipante.nombre,
          ticketLevel: 'PL'
        });
        
        setShowCodeModal(true);
        
        // Mensaje según tipo
        let successMsg = `¡${selectedParticipante.nombre} inscrito en Programa de Liderato - ${visionRegistrada}!`;
        if (isUpgrade) {
          successMsg = `¡Upgrade a Combo completado para ${selectedParticipante.nombre}!`;
        }
        showNotification('success', successMsg);
        
        // Limpiar formularios
        setCobroForm({ amount: '', reference: '', visionId: '', participanteId: '' });
        setSelectedParticipante(null);
        setSearchParticipante('');
        setSelectedLevel('');
        setSelectedPriceOption(null);
        
        fetchInitialData();
        setLoading(false);
        return; // 🛑 SALIR
      }
      
      // Para otros niveles, usar el participante seleccionado
      reference = reference || (selectedParticipante ? `Pago ${selectedParticipante.nombre}` : `Cobro $${cobroForm.amount}`);
      
      // Generar código de pago
      const res = await fetch('/api/treasury/payment-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(cobroForm.amount),
          reference,
          visionId: cobroForm.visionId || null,
          participanteId
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
        
        // Limpiar todos los formularios
        setCobroForm({ amount: '', reference: '', visionId: '', participanteId: '' });
        setSelectedParticipante(null);
        setSearchParticipante('');
        setSelectedLevel('');
        setSelectedPriceOption(null);
        setNewUserForm({ nombre: '', fechaNacimiento: '', email: '', telefono: '' });
        
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

  // Formatear número con separador de miles
  const formatNumber = (num: number): string => {
    return num.toLocaleString('es-MX');
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

            {/* NUEVO FLUJO DE COBRO ESTRUCTURADO */}
            
            {/* PASO 1: Selector de Visión */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">1️⃣ Registrar a Visión *</label>
              <select
                value={cobroForm.visionId}
                onChange={(e) => {
                  setCobroForm({ ...cobroForm, visionId: e.target.value, participanteId: '', amount: '', reference: '' });
                  setSelectedParticipante(null);
                  setSearchParticipante('');
                  setSelectedLevel('');
                  setSelectedPriceOption(null);
                }}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-green-500/50 focus:outline-none"
              >
                <option value="">Selecciona una visión...</option>
                {visiones.map(v => (
                  <option key={v.id} value={v.id}>
                    🎯 {v.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* PASO 2: Selector de Participante - Solo cuando hay visión seleccionada */}
            {cobroForm.visionId && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">2️⃣ Nombre / Referencia (busca en toda la organización)</label>
                {selectedParticipante ? (
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                        {selectedParticipante.nombre.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{selectedParticipante.nombre}</p>
                        <p className="text-xs text-slate-400">{selectedParticipante.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedParticipante(null);
                        setCobroForm({ ...cobroForm, participanteId: '', amount: '', reference: '' });
                        setSearchParticipante('');
                        setGlobalSearchResults([]);
                        setSelectedLevel('');
                        setSelectedPriceOption(null);
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
                      placeholder="Buscar por nombre, email o teléfono..."
                      value={searchParticipante}
                      onChange={(e) => {
                        setSearchParticipante(e.target.value);
                        searchUsersGlobally(e.target.value);
                      }}
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
                    />
                    {loadingGlobalSearch && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500/30 border-t-blue-500" />
                      </div>
                    )}
                    {/* Lista de usuarios encontrados globalmente */}
                    {searchParticipante.length >= 2 && (
                      <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {loadingGlobalSearch ? (
                          <div className="px-3 py-4 text-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500/30 border-t-blue-500 mx-auto" />
                            <p className="text-slate-400 text-xs mt-2">Buscando...</p>
                          </div>
                        ) : globalSearchResults.length > 0 ? (
                          globalSearchResults.map((p: any) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedParticipante(p);
                                setCobroForm({ ...cobroForm, participanteId: p.id.toString() });
                                setSearchParticipante('');
                                setGlobalSearchResults([]);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-b-0 flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
                                {p.nombre.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
                                <p className="text-xs text-slate-400 truncate">{p.email}</p>
                                {p.referralCode && (
                                  <p className="text-xs text-purple-400">🎟️ {p.referralCode}</p>
                                )}
                              </div>
                              {p.isGraduated && (
                                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">GC</span>
                              )}
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-3 text-slate-500 text-sm text-center">
                            No se encontraron usuarios con "{searchParticipante}"
                          </p>
                        )}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      🔍 Busca en toda la organización, no solo en esta visión
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PASO 3: Selector de Nivel - Solo cuando hay participante */}
            {selectedParticipante && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">3️⃣ Nivel de Entrenamiento *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setSelectedLevel('BASIC');
                      setSelectedPriceOption(null);
                      setNewUserForm({ nombre: '', fechaNacimiento: '', email: '', telefono: '' });
                    }}
                    className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                      selectedLevel === 'BASIC'
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : 'bg-slate-800/50 border-slate-600/50 text-slate-400 hover:border-green-500/50'
                    }`}
                  >
                    <span className="text-xl">🌱</span>
                    <span className="text-xs font-semibold">Básico</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedLevel('ADVANCED');
                      setSelectedPriceOption(null);
                      setNewUserForm({ nombre: '', fechaNacimiento: '', email: '', telefono: '' });
                    }}
                    className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                      selectedLevel === 'ADVANCED'
                        ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                        : 'bg-slate-800/50 border-slate-600/50 text-slate-400 hover:border-orange-500/50'
                    }`}
                  >
                    <span className="text-xl">🔥</span>
                    <span className="text-xs font-semibold">Avanzado</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedLevel('PL');
                      setSelectedPriceOption(null);
                      setNewUserForm({ nombre: '', fechaNacimiento: '', email: '', telefono: '' });
                    }}
                    className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                      selectedLevel === 'PL'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                        : 'bg-slate-800/50 border-slate-600/50 text-slate-400 hover:border-purple-500/50'
                    }`}
                  >
                    <span className="text-xl">👑</span>
                    <span className="text-xs font-semibold">Liderato</span>
                  </button>
                </div>
              </div>
            )}

            {/* PASO 3.5: Formulario Nuevo Usuario (Solo para Básico) */}
            {selectedLevel === 'BASIC' && selectedParticipante && (
              <div className="space-y-3 p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-400">👤</span>
                  <label className="text-xs text-green-400 font-medium">Datos del Nuevo Participante</label>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  <span className="font-semibold text-blue-400">{selectedParticipante.nombre}</span> está invitando a esta persona
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Nombre Completo *</label>
                    <input
                      type="text"
                      placeholder="Ej: Juan Pérez García"
                      value={newUserForm.nombre}
                      onChange={(e) => setNewUserForm({ ...newUserForm, nombre: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-green-500/50 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Fecha de Nacimiento *</label>
                    <input
                      type="date"
                      value={newUserForm.fechaNacimiento}
                      onChange={(e) => setNewUserForm({ ...newUserForm, fechaNacimiento: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-green-500/50 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Correo Electrónico *</label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-green-500/50 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Teléfono *</label>
                    <input
                      type="tel"
                      placeholder="Ej: 5512345678"
                      value={newUserForm.telefono}
                      onChange={(e) => setNewUserForm({ ...newUserForm, telefono: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-green-500/50 focus:outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PASO 4: Opciones de Precio - Solo cuando hay nivel seleccionado Y (para básico: tiene datos de usuario / para otros: directamente) */}
            {selectedLevel && organizationPrices && (
              (selectedLevel === 'BASIC' && newUserForm.nombre && newUserForm.email) ||
              (selectedLevel !== 'BASIC')
            ) && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  {selectedLevel === 'BASIC' ? '4️⃣' : '4️⃣'} Selecciona el Monto *
                </label>
                <div className="space-y-2">
                  {(organizationPrices[selectedLevel] || []).map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPriceOption(option)}
                      className={`w-full p-3 rounded-lg border transition-all text-left ${
                        selectedPriceOption?.type === option.type
                          ? selectedLevel === 'BASIC' 
                            ? 'bg-green-500/20 border-green-500' 
                            : selectedLevel === 'ADVANCED'
                              ? 'bg-orange-500/20 border-orange-500'
                              : 'bg-purple-500/20 border-purple-500'
                          : 'bg-slate-800/50 border-slate-600/50 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`font-bold text-lg ${
                            selectedPriceOption?.type === option.type ? 'text-white' : 'text-slate-300'
                          }`}>
                            ${formatNumber(option.amount)}
                          </span>
                          <span className="text-slate-400 text-sm ml-2">
                            {option.type.includes('PROMO') ? '✨ Promoción' : 
                             option.type.includes('COMBO') ? '📦 Full' :
                             option.type.includes('PARTIAL') ? '💳 Abono' :
                             option.type.includes('UPGRADE') ? '⬆️ Upgrade' : ''}
                          </span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedPriceOption?.type === option.type
                            ? selectedLevel === 'BASIC' 
                              ? 'border-green-500 bg-green-500' 
                              : selectedLevel === 'ADVANCED'
                                ? 'border-orange-500 bg-orange-500'
                                : 'border-purple-500 bg-purple-500'
                            : 'border-slate-500'
                        }`}>
                          {selectedPriceOption?.type === option.type && (
                            <CheckCircle size={12} className="text-white" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{option.description}</p>
                    </button>
                  ))}
                  {(!organizationPrices[selectedLevel] || organizationPrices[selectedLevel].length === 0) && (
                    <p className="text-slate-500 text-sm text-center py-4">
                      No hay precios configurados para este nivel. 
                      <br />
                      <span className="text-xs">Configura los precios en el panel de administración.</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Campo de Monto (readonly, se llena automático) */}
            {selectedPriceOption && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Monto</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={cobroForm.amount}
                      readOnly
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 cursor-not-allowed opacity-75"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
                  <div className="px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-300 text-sm">
                    {selectedPriceOption.description.split(' - ')[0]}
                  </div>
                </div>
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
                    {selectedLevel === 'BASIC' ? '✨ Registrar Nuevo Participante' : 'Generar Código de Cobro'}
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

    {/* MODAL DE CÓDIGO GENERADO - Solo Ticket */}
    {showCodeModal && generatedCode && (
      <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto"
        onClick={() => setShowCodeModal(false)}
      >
        <div 
          className="max-w-[320px] w-full my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Título */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-black text-white">
              {generatedCode.status === 'REDEEMED' ? '¡Registro Exitoso!' : 'Código Generado'}
            </h2>
            <p className="text-slate-400 text-sm">
              {generatedCode.status === 'REDEEMED' ? 'Bienvenido!!!! 🎉' : 'Pendiente de pago'}
            </p>
          </div>

          {/* TICKET VISUAL - Igual que checkout/success */}
          {generatedCode.status === 'REDEEMED' && generatedCode.ticketId ? (
            <div 
              id="cash-ticket-card"
              className="rounded-2xl overflow-hidden relative"
              style={{ 
                boxShadow: '0 0 40px rgba(0, 240, 255, 0.3), inset 0 1px 0 rgba(0, 240, 255, 0.2)',
                border: '2px solid #00F0FF',
              }}
            >
              {/* CORO2.png Background */}
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: 'url(/CORO2.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              {/* Dark Overlay - semi transparente para ver CORO2 */}
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-900/60 to-black/70" />

              {/* Scan Lines Effect */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div 
                  className="absolute inset-0 opacity-5"
                  style={{
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 240, 255, 0.1) 2px, rgba(0, 240, 255, 0.1) 4px)',
                  }}
                />
              </div>

              {/* Header - ACCESS GRANTED */}
              <div className="relative z-10 p-4">
                <div 
                  className="text-center py-2 px-4 rounded-lg bg-[#00F0FF]/10"
                  style={{ border: '1px solid rgba(0, 240, 255, 0.3)' }}
                >
                  <p 
                    className="text-xs font-bold tracking-[0.3em] text-[#00F0FF]"
                    style={{ textShadow: '0 0 10px rgba(0, 240, 255, 0.5)' }}
                  >
                    ▸ ACCESS GRANTED ◂
                  </p>
                </div>

                {/* Badge NO TRANSFERIBLE */}
                <div className="mt-2 py-1.5 px-3 rounded-lg bg-red-500/20 border border-red-500/30 text-center">
                  <p className="text-[10px] font-bold text-red-400 tracking-wider">
                    ⚠ NO TRANSFERIBLE
                  </p>
                </div>
              </div>

              {/* Quantum Symbol */}
              <div className="relative z-10 flex justify-center py-2">
                <div className="relative">
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ 
                      border: '2px dashed rgba(0, 240, 255, 0.4)',
                      background: 'radial-gradient(circle, rgba(0, 240, 255, 0.1) 0%, transparent 70%)'
                    }}
                  >
                    <div className="text-[#00F0FF] text-3xl">⚛</div>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="relative z-10 px-4 pb-3 space-y-2">
                <div className="flex justify-between items-center border-b border-slate-700/30 pb-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">CODENAME:</span>
                  <span className="text-sm text-[#00F0FF] font-bold tracking-wide">{generatedCode.participantName?.toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-700/30 pb-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">LEVEL:</span>
                  <span className="text-sm text-[#00F0FF] font-bold tracking-wide">
                    {generatedCode.ticketLevel === 'BASIC' ? 'BÁSICO' : 
                     generatedCode.ticketLevel === 'ADVANCED' ? 'AVANZADO' : 
                     generatedCode.ticketLevel === 'PL' ? 'LIDERATO' : 
                     generatedCode.ticketLevel === 'FULL' ? 'FULL' : generatedCode.ticketLevel}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-700/30 pb-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">STATUS:</span>
                  <span className="text-sm text-[#00F0FF] font-bold tracking-wide">PARTICIPANTE</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-700/30 pb-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">VISION:</span>
                  <span className="text-sm text-[#00F0FF] font-bold tracking-wide">{generatedCode.visionName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">FECHA:</span>
                  <span className="text-sm text-[#00F0FF] font-bold tracking-wide">
                    {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).toUpperCase().replace('.', '')}
                  </span>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="relative z-10 flex flex-col items-center py-4">
                <div 
                  className="p-3 rounded-xl"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 0 30px rgba(0, 240, 255, 0.4), inset 0 0 20px rgba(0, 240, 255, 0.1)'
                  }}
                >
                  <QRCodeSVG
                    value={generatedCode.ticketId}
                    size={140}
                    level="H"
                    fgColor="#0f172a"
                    bgColor="transparent"
                  />
                </div>
                <p 
                  className="text-center text-[7px] mt-3 tracking-wide text-[#00F0FF]/60"
                  style={{ fontFamily: 'monospace' }}
                >
                  ID: {generatedCode.ticketId.toUpperCase()}
                </p>
              </div>

              {/* Glowing Edge Effect */}
              <div 
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ boxShadow: 'inset 0 0 30px rgba(0, 240, 255, 0.1)' }}
              />
            </div>
          ) : (
            /* Código de referencia para pagos pendientes */
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 text-center">
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Código de Referencia</p>
              <code 
                className="text-2xl font-mono font-black tracking-wider block py-3 px-4 rounded-xl bg-slate-900 border border-slate-600 text-green-400"
              >
                {generatedCode.code}
              </code>
              <p className="text-slate-400 text-sm mt-3">Monto: <span className="text-white font-bold">{formatMoney(generatedCode.amount)}</span></p>
            </div>
          )}

          {/* Warning + Guardar Ticket */}
          {generatedCode.status === 'REDEEMED' && generatedCode.ticketId && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <p className="text-yellow-400 text-xs font-medium text-center mb-2">
                ⚠️ <strong>¡IMPORTANTE!</strong> Guarda este ticket para ingresar al evento.
              </p>
              <button
                onClick={async () => {
                  const ticketElement = document.getElementById('cash-ticket-card');
                  if (ticketElement) {
                    try {
                      const html2canvas = (await import('html2canvas')).default;
                      const canvas = await html2canvas(ticketElement, {
                        backgroundColor: '#0f172a',
                        scale: 2
                      });
                      const link = document.createElement('a');
                      link.download = `ticket-${generatedCode.ticketId}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                      showNotification('success', '¡Ticket guardado!');
                    } catch {
                      const ticketText = `🎫 *TICKET DE INGRESO*\n\n` +
                        `👤 *Participante:* ${generatedCode.participantName}\n` +
                        `🎯 *Visión:* ${generatedCode.visionName}\n` +
                        `🔑 *ID:* ${generatedCode.ticketId}\n\n` +
                        `📱 Presenta este código en la entrada.`;
                      navigator.clipboard.writeText(ticketText);
                      showNotification('success', '¡Información copiada!');
                    }
                  }
                }}
                className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Guardar Ticket
              </button>
            </div>
          )}

          {/* Tip para nuevos usuarios */}
          {generatedCode.status === 'REDEEMED' && (
            <p className="text-slate-400 text-xs text-center mt-3">
              🔐 Contraseña inicial: <span className="text-white font-mono">Quantum123</span>
            </p>
          )}

          {/* Botón Cerrar */}
          <button
            onClick={() => setShowCodeModal(false)}
            className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <X size={20} />
            Cerrar
          </button>
        </div>
      </div>
    )}

    {/* MODAL DE ESTADO DEL PAGO CON TARJETA */}
    {showPOSStatusModal && (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-start justify-center p-4 overflow-y-auto"
        onClick={(e) => {
          // Solo cerrar si el pago está completado o hay error
          if (['completed', 'error', 'cancelled'].includes(posPaymentStatus.stage)) {
            setShowPOSStatusModal(false);
          }
        }}
      >
        <div 
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border rounded-2xl w-full max-w-sm shadow-2xl my-8"
          style={{ borderColor: `${orgInfo.brandColor}40` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div 
            className="p-6 border-b text-center"
            style={{ 
              background: `linear-gradient(to right, ${orgInfo.brandColor}20, transparent)`,
              borderColor: `${orgInfo.brandColor}20`
            }}
          >
            <div className="flex justify-center mb-3">
              {posPaymentStatus.stage === 'sending' && (
                <div className="p-4 bg-blue-500/20 rounded-full animate-pulse">
                  <Smartphone className="text-blue-400" size={32} />
                </div>
              )}
              {posPaymentStatus.stage === 'waiting' && (
                <div className="p-4 bg-yellow-500/20 rounded-full">
                  <CreditCard className="text-yellow-400 animate-pulse" size={32} />
                </div>
              )}
              {posPaymentStatus.stage === 'processing' && (
                <div className="p-4 bg-blue-500/20 rounded-full">
                  <Loader2 className="text-blue-400 animate-spin" size={32} />
                </div>
              )}
              {posPaymentStatus.stage === 'approved' && (
                <div className="p-4 bg-green-500/20 rounded-full animate-bounce">
                  <CheckCircle className="text-green-400" size={32} />
                </div>
              )}
              {posPaymentStatus.stage === 'registering' && (
                <div className="p-4 bg-blue-500/20 rounded-full">
                  <Users className="text-blue-400 animate-pulse" size={32} />
                </div>
              )}
              {posPaymentStatus.stage === 'completed' && (
                <div className="p-4 bg-green-500/20 rounded-full">
                  <CheckCircle className="text-green-400" size={32} />
                </div>
              )}
              {(posPaymentStatus.stage === 'error' || posPaymentStatus.stage === 'cancelled') && (
                <div className="p-4 bg-red-500/20 rounded-full">
                  <AlertTriangle className="text-red-400" size={32} />
                </div>
              )}
            </div>
            <h3 className="text-xl font-bold text-white">
              {posPaymentStatus.stage === 'sending' && 'Enviando a Terminal'}
              {posPaymentStatus.stage === 'waiting' && 'Esperando Pago'}
              {posPaymentStatus.stage === 'processing' && 'Procesando'}
              {posPaymentStatus.stage === 'approved' && '¡Pago Recibido!'}
              {posPaymentStatus.stage === 'registering' && 'Registrando...'}
              {posPaymentStatus.stage === 'completed' && '¡Completado!'}
              {posPaymentStatus.stage === 'error' && 'Error'}
              {posPaymentStatus.stage === 'cancelled' && 'Cancelado'}
            </h3>
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            {/* Mensaje de estado */}
            <p className={`text-lg font-medium mb-4 ${
              posPaymentStatus.stage === 'completed' ? 'text-green-400' :
              posPaymentStatus.stage === 'error' || posPaymentStatus.stage === 'cancelled' ? 'text-red-400' :
              'text-slate-300'
            }`}>
              {posPaymentStatus.message}
            </p>

            {/* Monto */}
            {cobroForm.amount && (
              <div 
                className="p-4 rounded-xl border mb-4"
                style={{ 
                  background: `linear-gradient(to right, ${orgInfo.brandColor}20, ${orgInfo.brandColor}10)`,
                  borderColor: `${orgInfo.brandColor}30`
                }}
              >
                <p className="text-xs text-slate-400 mb-1">MONTO</p>
                <p className="text-3xl font-black text-white">
                  ${parseFloat(cobroForm.amount).toLocaleString('es-MX')}
                </p>
              </div>
            )}

            {/* Barra de progreso animada para estados de espera */}
            {['sending', 'waiting', 'processing', 'registering'].includes(posPaymentStatus.stage) && (
              <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 rounded-full animate-pulse"
                  style={{ 
                    backgroundColor: orgInfo.brandColor,
                    width: posPaymentStatus.stage === 'sending' ? '25%' : 
                           posPaymentStatus.stage === 'waiting' ? '50%' : 
                           posPaymentStatus.stage === 'processing' ? '75%' : 
                           '90%',
                    transition: 'width 0.5s ease-in-out'
                  }}
                />
              </div>
            )}

            {/* Estado completado: mostrar ticket de confirmación */}
            {posPaymentStatus.stage === 'completed' && posPaymentStatus.ticketId && (
              <>
                {/* Ticket Visual con QR - Estilo Cyberpunk */}
                <div 
                  id="treasury-ticket-card"
                  className="mt-4 rounded-2xl overflow-hidden relative"
                    style={{ 
                      boxShadow: '0 0 40px rgba(0, 240, 255, 0.3), inset 0 1px 0 rgba(0, 240, 255, 0.2)',
                      border: '2px solid #00F0FF',
                    }}
                  >
                    {/* CORO2.png Background Image */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        backgroundImage: 'url(/CORO2.png)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    {/* Dark Overlay - semi transparente para ver CORO2 */}
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-900/60 to-black/70" />

                    {/* Scan Lines Effect */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div 
                        className="absolute inset-0 opacity-5"
                        style={{
                          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 240, 255, 0.1) 2px, rgba(0, 240, 255, 0.1) 4px)',
                        }}
                      />
                    </div>

                    {/* Header - ACCESS GRANTED */}
                    <div className="relative z-10 p-3">
                      <div 
                        className="text-center py-2 px-4 rounded-lg bg-[#00F0FF]/10"
                        style={{ border: '1px solid rgba(0, 240, 255, 0.3)' }}
                      >
                        <p 
                          className="text-xs tracking-[0.3em] font-bold text-[#00F0FF]"
                          style={{ fontFamily: 'monospace' }}
                        >
                          ▸ ACCESS GRANTED ◂
                        </p>
                      </div>
                      
                      {/* NO TRANSFERIBLE Warning */}
                      <div 
                        className="mt-2 text-center py-1 px-3 rounded bg-red-900/30"
                        style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}
                      >
                        <p className="text-[10px] tracking-wider text-red-400 font-medium">
                          ⚠ NO TRANSFERIBLE
                        </p>
                      </div>
                    </div>

                    {/* Logo Section with Rotating Ring */}
                    <div className="relative z-10 flex justify-center my-3">
                      <div className="relative">
                        {/* Rotating Ring */}
                        <div className="absolute -inset-2 animate-spin" style={{ animationDuration: '8s' }}>
                          <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              fill="none"
                              stroke="#00F0FF"
                              strokeWidth="1"
                              strokeDasharray="10 5"
                              opacity="0.5"
                            />
                          </svg>
                        </div>
                        
                        {/* Hexagon Container */}
                        <div 
                          className="relative w-16 h-16 flex items-center justify-center"
                          style={{
                            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                            background: 'linear-gradient(180deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 240, 255, 0.05) 100%)',
                          }}
                        >
                          {/* Quantum Symbol */}
                          <svg viewBox="0 0 100 100" className="w-10 h-10">
                            <ellipse cx="50" cy="50" rx="35" ry="15" fill="none" stroke="#00F0FF" strokeWidth="2" transform="rotate(-45 50 50)"/>
                            <ellipse cx="50" cy="50" rx="35" ry="15" fill="none" stroke="#00F0FF" strokeWidth="2" transform="rotate(45 50 50)"/>
                            <circle cx="50" cy="50" r="6" fill="#00F0FF"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* User Data Rows */}
                    <div className="relative z-10 px-3 space-y-1">
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                        <span className="text-[10px] tracking-wider text-slate-500" style={{ fontFamily: 'monospace' }}>CODENAME:</span>
                        <span className="text-xs font-bold text-[#00F0FF]" style={{ fontFamily: 'monospace' }}>
                          {posPaymentStatus.participantName?.split(' ')[0].toUpperCase() || 'AGENT'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                        <span className="text-[10px] tracking-wider text-slate-500" style={{ fontFamily: 'monospace' }}>LEVEL:</span>
                        <span className={`text-xs font-bold ${
                          posPaymentStatus.isCombo ? 'text-green-400' :
                          posPaymentStatus.ticketLevel === 'BASIC' ? 'text-[#00F0FF]' : 
                          posPaymentStatus.ticketLevel === 'ADVANCED' ? 'text-purple-400' : 'text-yellow-400'
                        }`} style={{ fontFamily: 'monospace' }}>
                          {posPaymentStatus.isCombo ? 'FULL (B+A+L)' :
                           posPaymentStatus.ticketLevel === 'BASIC' ? 'BÁSICO' : 
                           posPaymentStatus.ticketLevel === 'ADVANCED' ? 'AVANZADO' : 'PL'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                        <span className="text-[10px] tracking-wider text-slate-500" style={{ fontFamily: 'monospace' }}>STATUS:</span>
                        <span className="text-xs font-bold text-emerald-400" style={{ fontFamily: 'monospace' }}>PARTICIPANTE</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                        <span className="text-[10px] tracking-wider text-slate-500" style={{ fontFamily: 'monospace' }}>VISION:</span>
                        <span className="text-xs font-bold text-[#00F0FF]" style={{ fontFamily: 'monospace' }}>
                          {posPaymentStatus.visionName || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* QR Code Section */}
                    <div className="relative z-10 p-3">
                      <div className="flex justify-center">
                        <div 
                          className="p-2 rounded-lg"
                          style={{
                            background: '#000',
                            border: '2px solid #00F0FF',
                          }}
                        >
                          <QRCodeSVG
                            value={`TICKET:${posPaymentStatus.ticketId}`}
                            size={90}
                            bgColor="transparent"
                            fgColor="#00F0FF"
                            level="M"
                          />
                        </div>
                      </div>
                      <p 
                        className="text-center text-[7px] mt-2 tracking-wide text-[#00F0FF]/60"
                        style={{ fontFamily: 'monospace' }}
                      >
                        ID: {posPaymentStatus.ticketId.toUpperCase()}
                      </p>
                    </div>

                    {/* Glowing Edge Effect */}
                    <div 
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{ boxShadow: 'inset 0 0 30px rgba(0, 240, 255, 0.1)' }}
                    />
                  </div>

                {/* Warning Message - Guardar Ticket */}
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <p className="text-yellow-400 text-xs font-medium text-center mb-2">
                      ⚠️ <strong>¡IMPORTANTE!</strong> Guarda este ticket para ingresar al evento.
                    </p>
                    <button
                      onClick={async () => {
                        const ticketElement = document.getElementById('treasury-ticket-card');
                        if (ticketElement) {
                          try {
                            const html2canvas = (await import('html2canvas')).default;
                            const canvas = await html2canvas(ticketElement, {
                              backgroundColor: '#0f172a',
                              scale: 2
                            });
                            const link = document.createElement('a');
                            link.download = `ticket-${posPaymentStatus.ticketId}.png`;
                            link.href = canvas.toDataURL('image/png');
                            link.click();
                            showNotification('success', '¡Ticket guardado!');
                          } catch {
                            // Fallback: compartir por WhatsApp
                            const ticketText = `🎫 *TICKET DE INGRESO*\n\n` +
                              `👤 *Participante:* ${posPaymentStatus.participantName}\n` +
                              `🎯 *Visión:* ${posPaymentStatus.visionName}\n` +
                              `🔑 *ID:* ${posPaymentStatus.ticketId}\n\n` +
                              `📱 Presenta este código en la entrada.`;
                            navigator.clipboard.writeText(ticketText);
                            showNotification('success', '¡Información copiada!');
                          }
                        }
                      }}
                      className="w-full py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <Download size={16} />
                      Guardar Ticket
                    </button>
                  </div>

                {/* Código de Confirmación - solo si existe */}
                {posPaymentStatus.confirmationCode && (
                  <div 
                    className="mt-4 p-4 rounded-xl border-2 border-dashed"
                    style={{ 
                      backgroundColor: `${orgInfo.brandColor}15`,
                      borderColor: `${orgInfo.brandColor}40`
                    }}
                  >
                    <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Código de Confirmación</p>
                    <code 
                      className="text-2xl font-mono font-black tracking-wider block"
                      style={{ color: orgInfo.brandColor }}
                    >
                      {posPaymentStatus.confirmationCode}
                    </code>
                  </div>
                )}

                {/* Info del participante (solo si no hay ticket visual) */}
                {!posPaymentStatus.ticketId && (
                  <div className="mt-4 space-y-2 text-left">
                    {posPaymentStatus.participantName && (
                      <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                        <span className="text-slate-400 text-sm">👤 Participante</span>
                        <span className="text-white font-medium text-sm">{posPaymentStatus.participantName}</span>
                      </div>
                    )}
                    {posPaymentStatus.visionName && (
                      <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                        <span className="text-slate-400 text-sm">🎯 Visión</span>
                        <span className="text-white font-medium text-sm">{posPaymentStatus.visionName}</span>
                      </div>
                    )}
                    {posPaymentStatus.isCombo && (
                      <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                        <span className="text-slate-400 text-sm">📦 Tipo</span>
                        <span className="text-green-400 font-bold text-sm">FULL (Básico + Avanzado + Liderato)</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Contraseña */}
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <p className="text-green-400 text-sm">
                    🔑 Contraseña inicial: <strong>Quantum123</strong>
                  </p>
                </div>

                {/* Botones de acción */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(posPaymentStatus.confirmationCode || '');
                      showNotification('success', '¡Código copiado!');
                    }}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Copy size={16} />
                    Copiar
                  </button>
                  
                  {posPaymentStatus.ticketId && (
                    <button
                      onClick={async () => {
                        // Compartir ticket
                        const ticketText = `🎫 *TICKET DE INGRESO*\n\n` +
                          `👤 *Participante:* ${posPaymentStatus.participantName}\n` +
                          `🎯 *Visión:* ${posPaymentStatus.visionName}\n` +
                          `🏷️ *Nivel:* ${posPaymentStatus.isCombo ? 'FULL (B+A+L)' : posPaymentStatus.ticketLevel}\n` +
                          `🔑 *Código:* ${posPaymentStatus.ticketId}\n\n` +
                          `📱 Presenta este código o QR en la entrada.\n` +
                          `🔐 Contraseña inicial: Quantum123`;
                        
                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: 'Ticket de Ingreso',
                              text: ticketText
                            });
                          } catch {
                            navigator.clipboard.writeText(ticketText);
                            showNotification('success', '¡Ticket copiado al portapapeles!');
                          }
                        } else {
                          navigator.clipboard.writeText(ticketText);
                          showNotification('success', '¡Ticket copiado al portapapeles!');
                        }
                      }}
                      className="flex-1 px-4 py-2 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                      style={{ backgroundColor: orgInfo.brandColor }}
                    >
                      <Share2 size={16} />
                      Compartir
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Estado completado sin código (otros niveles) */}
            {posPaymentStatus.stage === 'completed' && !posPaymentStatus.confirmationCode && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                <p className="text-green-400 text-sm">
                  ✅ Pago registrado correctamente
                </p>
              </div>
            )}

            {/* Error message */}
            {posPaymentStatus.error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm">{posPaymentStatus.error}</p>
              </div>
            )}

            {/* Tip para estado de espera */}
            {posPaymentStatus.stage === 'waiting' && (
              <p className="text-slate-500 text-xs mt-4">
                💳 El cliente debe pasar o acercar su tarjeta en la terminal
              </p>
            )}
          </div>

          {/* Footer con botones */}
          <div className="p-4 border-t border-slate-700/50">
            {['completed', 'error', 'cancelled'].includes(posPaymentStatus.stage) ? (
              <button
                onClick={() => setShowPOSStatusModal(false)}
                className="w-full px-4 py-3 font-bold rounded-xl transition-all"
                style={{ 
                  background: posPaymentStatus.stage === 'completed' 
                    ? `linear-gradient(to right, ${orgInfo.brandColor}, ${orgInfo.brandColor}CC)`
                    : 'linear-gradient(to right, #475569, #334155)',
                  color: 'white'
                }}
              >
                {posPaymentStatus.stage === 'completed' ? 'Cerrar' : 'Entendido'}
              </button>
            ) : (
              <button
                onClick={() => {
                  handleCancelPOS();
                  setShowPOSStatusModal(false);
                  setPosPaymentStatus({ stage: 'cancelled', message: 'Pago cancelado' });
                }}
                className="w-full px-4 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold rounded-xl transition-all border border-red-500/30"
              >
                Cancelar Pago
              </button>
            )}
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
