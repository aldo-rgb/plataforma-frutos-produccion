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
    // - IDs numéricos largos
    return deviceId.includes('PAX') || deviceId.includes('SMARTPOS') || deviceId.includes('DSPREAD') || /^\d{10,}$/.test(deviceId);
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
          const paymentStatus = data.paymentIntent?.payment?.status; // Estado real del pago
          
          // IMPORTANTE: FINISHED solo significa que la intención terminó
          // Debemos verificar payment.status para saber si fue aprobado o rechazado
          if (state === 'FINISHED') {
            clearInterval(pollInterval);
            
            // Verificar si el pago fue realmente aprobado
            if (paymentStatus === 'approved') {
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
                  isCombo: registerResult.isCombo
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
                  isCombo: registerResult.isCombo
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
                  isCombo: false
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
              // FINISHED pero payment.status NO es 'approved' = RECHAZADO
              const rejectReason = data.paymentIntent?.payment?.status_detail || 'Tarjeta rechazada';
              setPosPaymentStatus({ 
                stage: 'error', 
                message: 'Pago Rechazado',
                error: `El pago fue rechazado: ${rejectReason}`
              });
              setActivePOSTransaction(prev => prev ? { ...prev, status: 'ERROR' } : null);
              showNotification('error', `Pago rechazado: ${rejectReason}`);
              
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
          visionName: visionRegistrada
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
          visionName: visionRegistrada
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
          visionName: visionRegistrada
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
              <label className="text-xs text-slate-400 mb-1 block">1️⃣ Visión *</label>
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
                <label className="text-xs text-slate-400 mb-1 block">2️⃣ Participante (quien paga/invita)</label>
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
                                setCobroForm({ ...cobroForm, participanteId: p.id.toString() });
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
                  {generatedCode.status === 'REDEEMED' ? 'Código de Confirmación' : 'Codigo de Referencia'}
                </h3>
                <p className="text-xs text-slate-400">
                  {generatedCode.status === 'REDEEMED' ? 'Registro completado exitosamente' : 'Comprobante de cobro generado'}
                </p>
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
                <h4 className="text-white font-bold text-lg">
                  {generatedCode.status === 'REDEEMED' ? 'CÓDIGO DE CONFIRMACIÓN' : 'CODIGO DE REFERENCIA'}
                </h4>
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
                  <p className="text-xs text-slate-400 mb-1">
                    {generatedCode.status === 'REDEEMED' ? 'MONTO REGISTRADO' : 'MONTO A REDIMIR'}
                  </p>
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
                    {generatedCode.status === 'REDEEMED' ? (
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/30">
                        ✓ CONFIRMADO
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/30">
                        PENDIENTE
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer del recibo */}
              <div 
                className="p-4 text-center border-t border-slate-700/50"
                style={{ backgroundColor: `${orgInfo.brandColor}10` }}
              >
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                  {generatedCode.status === 'REDEEMED' 
                    ? '✓ Pago registrado correctamente en el sistema' 
                    : 'Presente esta referencia al momento del pago'}
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
                {generatedCode.status === 'REDEEMED' 
                  ? generatedCode.reference?.includes('Full') 
                    ? '🎉 Participante registrado FULL (Básico + Avanzado + Liderato). Contraseña: Quantum123' 
                    : '🎉 El nuevo participante ha sido registrado exitosamente. Contraseña inicial: Quantum123'
                  : '💡 La referencia será válida hasta que sea canjeada o cancelada'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* MODAL DE ESTADO DEL PAGO CON TARJETA */}
    {showPOSStatusModal && (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={(e) => {
          // Solo cerrar si el pago está completado o hay error
          if (['completed', 'error', 'cancelled'].includes(posPaymentStatus.stage)) {
            setShowPOSStatusModal(false);
          }
        }}
      >
        <div 
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
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

            {/* Estado completado: mostrar código de confirmación */}
            {posPaymentStatus.stage === 'completed' && posPaymentStatus.confirmationCode && (
              <>
                {/* Código de Confirmación */}
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

                {/* Info del participante */}
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

                {/* Contraseña */}
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <p className="text-green-400 text-sm">
                    🔑 Contraseña inicial: <strong>Quantum123</strong>
                  </p>
                </div>

                {/* Botón copiar código */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(posPaymentStatus.confirmationCode || '');
                    showNotification('success', '¡Código copiado!');
                  }}
                  className="mt-4 w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  Copiar Código
                </button>
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
