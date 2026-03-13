'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Sparkles,
  Star,
  Zap,
  Brain,
  Target,
  Heart,
  Trophy,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Loader2,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Phone,
  Mail,
  User,
  Crown,
  Rocket,
  Gift,
  CreditCard,
  ArrowLeft,
  Shield,
} from 'lucide-react';
import Image from 'next/image';

interface EventProduct {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  promoPrice: number | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  maxCapacity: number | null;
  currentEnrollment: number;
  isActive: boolean;
  type: string;
  Organization: {
    name: string;
    logoUrl: string | null;
    brandColor: string | null;
  } | null;
}

interface OtherTraining {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  type: string;
  basePrice: number;
  promoPrice: number | null;
  startDate: string | null;
  location: string | null;
}

// Nivel de transformación data
const transformationLevels = [
  {
    level: 'BÁSICO',
    duration: '1 fin de semana + 4 semanas',
    icon: '🌱',
    gradient: 'from-emerald-500 to-cyan-500',
    bgGradient: 'from-emerald-500/20 to-cyan-500/20',
    borderColor: 'border-emerald-500/30',
    description: 'Despierta tu potencial dormido. Rompe las cadenas mentales que te mantienen en tu zona de confort.',
    includes: [
      'Descubre metas y sueños ocultos con Quantum AI',
      'Acceso al Directorio de Talentos para networking',
      'Reprogramación de creencias limitantes',
      'Definición de visión personal asistida por IA',
      'Crea tu página web de negocio'
    ]
  },
  {
    level: 'AVANZADO',
    duration: '4 días',
    icon: '🔥',
    gradient: 'from-orange-500 to-red-500',
    bgGradient: 'from-orange-500/20 to-red-500/20',
    borderColor: 'border-orange-500/30',
    description: 'Domina tus emociones y relaciones. Conviértete en un líder que inspira con el ejemplo.',
    includes: [
      'IA que profundiza en tus metas y te guía',
      'Sistema de metas en 8 áreas de vida',
      'Mentor personal con llamadas semanales',
      'Inteligencia emocional y liderazgo',
      'Perfil destacado en Directorio de Talentos'
    ]
  },
  {
    level: 'PROGRAMA DE LIDERATO',
    duration: '10 semanas - 3 fines de semana',
    icon: '👑',
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-500/20 to-purple-600/20',
    borderColor: 'border-violet-500/30',
    description: 'La cumbre del entrenamiento. Certifícate como líder y construye tu legado que trasciende.',
    includes: [
      'Certificado de participación oficial',
      'Proyecto de impacto comunitario (Legado)',
      'Networking exclusivo con líderes certificados',
      'Mentoría ejecutiva 1:1 personalizada',
      'Acceso permanente al Directorio de Talentos'
    ]
  }
];

// Beneficios principales
const mainBenefits = [
  {
    icon: Brain,
    title: 'Quantum AI™',
    description: 'Inteligencia Artificial que analiza tu perfil y crea un plan de acción personalizado',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20'
  },
  {
    icon: Users,
    title: 'Mentor Personal',
    description: 'Un coach dedicado que te acompaña semanalmente en tu proceso de transformación',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20'
  },
  {
    icon: Target,
    title: 'Sistema de Metas',
    description: 'Metodología probada para definir y alcanzar objetivos en 8 áreas de tu vida',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20'
  },
  {
    icon: Rocket,
    title: 'Negocio Online',
    description: 'Crea tu página web profesional y monetiza tus talentos desde el primer fin de semana',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20'
  }
];

// Testimoniales
const testimonials = [
  {
    name: 'María González',
    role: 'Empresaria',
    quote: 'Antes del entrenamiento, mi negocio estaba estancado. Ahora facturo 3 veces más y tengo claridad total de hacia dónde voy.',
    avatar: '👩‍💼'
  },
  {
    name: 'Carlos Méndez',
    role: 'Coach de Vida',
    quote: 'El programa de liderato me dio las herramientas para ayudar a otros. Hoy tengo mi propia comunidad de 200+ personas.',
    avatar: '👨‍🏫'
  },
  {
    name: 'Ana Rodríguez',
    role: 'Ingeniera',
    quote: 'Llegué buscando equilibrio entre trabajo y familia. Salí con un plan de vida completo y la confianza para ejecutarlo.',
    avatar: '👩‍🔬'
  }
];

export default function EventoPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = params.productId as string;
  const refCode = searchParams.get('ref'); // Código de referido desde URL
  
  const [event, setEvent] = useState<EventProduct | null>(null);
  const [otherTrainings, setOtherTrainings] = useState<OtherTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Registro form
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    comoTeEnteraste: ''
  });
  
  // Búsqueda de usuarios (quien te invitó)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: number;
    nombre: string;
    imagen: string | null;
    referralCode: string | null;
    isGraduated: boolean;
    organizationName: string | null;
  }>>([]);
  const [selectedInviter, setSelectedInviter] = useState<{
    id: number;
    nombre: string;
  } | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Payment method selection
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'mercadopago' | null>(null);
  
  // Share
  const [copied, setCopied] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  
  // FAQ expanded
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    fetchEvent();
  }, [productId]);

  // Buscar usuario por código de referido cuando viene en la URL
  useEffect(() => {
    const fetchInviterByRefCode = async () => {
      if (!refCode) return;
      
      try {
        const res = await fetch(`/api/public/search-users?refCode=${encodeURIComponent(refCode)}`);
        const data = await res.json();
        if (data.success && data.users && data.users.length > 0) {
          const inviter = data.users[0];
          setSelectedInviter({ id: inviter.id, nombre: inviter.nombre });
        }
      } catch (err) {
        console.error('Error fetching inviter by ref code:', err);
      }
    };

    fetchInviterByRefCode();
  }, [refCode]);

  // Buscar usuarios cuando cambia el query
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      
      setSearchingUsers(true);
      try {
        const res = await fetch(`/api/public/search-users?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.users);
          setShowSearchResults(true);
        }
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setSearchingUsers(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/public/evento/${productId}`);
      const data = await res.json();
      
      if (data.success) {
        setEvent(data.product);
        setOtherTrainings(data.otherTrainings || []);
      } else {
        setError(data.error || 'Evento no encontrado');
      }
    } catch (err) {
      setError('Error al cargar el evento');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.nombre.trim() || !registerForm.email.trim()) {
      return;
    }
    
    // Mostrar opciones de pago
    setShowPaymentOptions(true);
  };

  const handlePaymentSelection = async (provider: 'stripe' | 'mercadopago') => {
    if (!registerForm.nombre.trim() || !registerForm.email.trim()) {
      return;
    }

    try {
      setRegistering(true);
      setSelectedPaymentMethod(provider);
      
      const res = await fetch(`/api/public/evento/${productId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: registerForm.nombre,
          email: registerForm.email,
          telefono: registerForm.telefono,
          invitedByUserId: selectedInviter?.id || null,
          provider: provider
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.url) {
        // Redirigir a la pasarela de pago
        window.location.href = data.url;
      } else {
        alert(data.error || 'Error al procesar el pago');
        setRegistering(false);
      }
    } catch (err) {
      alert('Error al procesar el pago');
      setRegistering(false);
    }
  };

  // Calcular precio actual
  const getCurrentPrice = () => {
    if (!event) return 0;
    const now = new Date();
    if (event.promoPrice && event.promoPrice < event.basePrice) {
      // Por ahora asumimos que si hay promoPrice, está vigente
      return event.promoPrice;
    }
    return event.basePrice;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleShare = (platform: string) => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `🚀 ${event?.name} - ¡No te lo pierdas! Un evento de transformación personal único.`;
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
    }
    setShowShareOptions(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Por confirmar';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando evento...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Evento no disponible</h1>
          <p className="text-slate-400 mb-6">{error || 'Este evento no existe o ya no está activo.'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const spotsLeft = event.maxCapacity ? event.maxCapacity - event.currentEnrollment : null;
  const isFree = event.basePrice === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Floating particles background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-cyan-500/3 to-transparent rounded-full" />
      </div>

      {/* Header with org logo */}
      <header className="relative z-10 py-4 px-4 border-b border-slate-800/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {event.Organization?.logoUrl ? (
              <Image
                src={event.Organization.logoUrl}
                alt={event.Organization.name}
                width={40}
                height={40}
                className="rounded-lg"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="text-white font-bold">{event.Organization?.name || 'Quantum Matter'}</span>
          </div>
          
          {/* Share button */}
          <div className="relative">
            <button
              onClick={() => setShowShareOptions(!showShareOptions)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-xl text-white transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Compartir</span>
            </button>
            
            {showShareOptions && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors text-left"
                >
                  <MessageCircle className="w-5 h-5 text-green-400" />
                  <span className="text-white">WhatsApp</span>
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors text-left"
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-slate-400" />}
                  <span className="text-white">{copied ? '¡Copiado!' : 'Copiar enlace'}</span>
                </button>
                <button
                  onClick={() => handleShare('facebook')}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors text-left"
                >
                  <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">f</div>
                  <span className="text-white">Facebook</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 py-8 md:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Mobile: Image first */}
          <div className="lg:hidden mb-6">
            <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-xl shadow-cyan-500/10">
              {event.imageUrl ? (
                <Image
                  src={event.imageUrl}
                  alt={event.name}
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover"
                />
              ) : (
                <div className="w-full aspect-video bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center">
                  <Sparkles className="w-16 h-16 text-cyan-400" />
                </div>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Event Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 mb-4">
                <Gift className="w-4 h-4 text-cyan-400" />
                <span className="text-xs sm:text-sm font-medium text-cyan-300">
                  {isFree ? 'EVENTO GRATUITO' : 'EVENTO ESPECIAL'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
                {event.name}
              </h1>

              <p className="text-base sm:text-lg text-slate-300 mb-6 leading-relaxed">
                {event.description || 'Un espacio para descubrir, compartir ideas y abrir nuevas posibilidades de transformación en tu vida.'}
              </p>

              {/* Event Details */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm sm:text-base">{formatDate(event.startDate)}</p>
                    {event.startDate && <p className="text-slate-400 text-xs sm:text-sm">{formatTime(event.startDate)}</p>}
                  </div>
                </div>

                {event.location && (
                  <div className="flex items-start gap-3 text-slate-300">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm sm:text-base break-words">{event.location}</p>
                      <p className="text-slate-400 text-xs sm:text-sm">Ver ubicación</p>
                    </div>
                  </div>
                )}
              </div>

              {/* CTA Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowRegisterModal(true)}
                className="w-full px-6 py-3 sm:py-4 bg-gradient-to-r from-cyan-500 to-violet-500 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                {isFree ? 'Reservar mi lugar GRATIS' : 'Inscribirme ahora'}
                <ArrowRight className="w-5 h-5" />
              </motion.button>

              {isFree && (
                <p className="text-slate-400 text-xs sm:text-sm mt-3 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Sin costo • Sin compromiso • Cupo limitado
                </p>
              )}
            </motion.div>

            {/* Right: Event Image - Desktop only */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative rounded-3xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-cyan-500/10">
                {event.imageUrl ? (
                  <Image
                    src={event.imageUrl}
                    alt={event.name}
                    width={600}
                    height={400}
                    className="w-full h-auto object-cover"
                  />
                ) : (
                  <div className="w-full aspect-video bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center">
                    <Sparkles className="w-20 h-20 text-cyan-400" />
                  </div>
                )}
                
                {/* Overlay badge */}
                <div className="absolute top-4 left-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-white font-bold text-sm shadow-lg">
                  🎯 TALLER
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 border-2 border-cyan-500/30 rounded-full animate-pulse" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 border-2 border-violet-500/30 rounded-full animate-pulse delay-500" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Other Workshops Section - Dynamic */}
      {otherTrainings.length > 0 && (
        <section className="relative z-10 py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 mb-6">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium text-orange-300">PRÓXIMOS EVENTOS</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-6">
                Otros
                <span className="block bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                  Talleres
                </span>
              </h2>
              
              <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
                Conoce todos los talleres disponibles de {event?.Organization?.name || 'nuestra organización'}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherTrainings.map((training, index) => (
                <motion.a
                  key={training.id}
                  href={`/evento/${training.id}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden hover:border-orange-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/10"
                >
                  {/* Image */}
                  <div className="relative h-80 overflow-hidden">
                    {training.imageUrl ? (
                      <Image
                        src={training.imageUrl}
                        alt={training.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center">
                        <Sparkles className="w-12 h-12 text-cyan-400" />
                      </div>
                    )}
                    
                    {/* Type Badge */}
                    <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold ${
                      training.type === 'CORE_TRAINING' 
                        ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white' 
                        : 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                    }`}>
                      {training.type === 'CORE_TRAINING' ? '🎯 ENTRENAMIENTO' : '🎪 TALLER'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
                      {training.name}
                    </h3>
                    
                    {training.description && (
                      <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                        {training.description}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      {training.startDate && (
                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                          <Calendar className="w-4 h-4 text-cyan-400" />
                          <span>{new Date(training.startDate).toLocaleDateString('es-MX', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })}</span>
                        </div>
                      )}
                      
                      {training.location && (
                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                          <MapPin className="w-4 h-4 text-violet-400" />
                          <span className="truncate">{training.location.split(',')[0]}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-cyan-400 font-semibold text-sm group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Ver detalles <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* The 3 Levels Section - Static info about the methodology */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 mb-6">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-300">EL CAMINO DEL HÉROE</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-6">
              3 Niveles de
              <span className="block bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                Transformación
              </span>
            </h2>
            
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
              Cada nivel está diseñado para llevarte al siguiente escalón de tu evolución personal y profesional.
            </p>

            {/* Banner Image */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-violet-500/10 mb-16">
              <Image
                src="/assets/CORO1.png"
                alt="Los 3 Niveles de Transformación - Básico, Avanzado, Programa de Liderazgo"
                width={1200}
                height={400}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {transformationLevels.map((level, index) => (
              <motion.div
                key={level.level}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className={`group relative bg-slate-900/50 backdrop-blur-sm rounded-2xl border ${level.borderColor} p-6 sm:p-8 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10`}
              >
                {/* Level number */}
                <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-r ${level.bgGradient} flex items-center justify-center text-2xl sm:text-3xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform`}>
                  {level.icon}
                </div>

                {/* Content */}
                <h3 className={`text-lg sm:text-xl font-bold bg-gradient-to-r ${level.gradient} bg-clip-text text-transparent mb-2`}>
                  {level.level}
                </h3>
                
                <p className="text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {level.duration}
                </p>

                <p className="text-slate-300 text-sm sm:text-base mb-4 sm:mb-6">{level.description}</p>

                {/* Includes */}
                <ul className="space-y-2">
                  {level.includes.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-400">
                      <Star className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Benefits Section */}
      <section className="relative z-10 py-16 px-4 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Lo Que Incluye Tu Proceso
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Herramientas de clase mundial para acelerar tu transformación
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mainBenefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 hover:border-cyan-500/30 transition-colors"
              >
                <div className={`w-14 h-14 ${benefit.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                  <benefit.icon className={`w-7 h-7 ${benefit.color}`} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{benefit.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative z-10 py-16 px-4 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Historias de Transformación
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Miles de personas han transformado su vida. Aquí algunas de sus historias.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500/20 to-violet-500/20 flex items-center justify-center text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="text-white font-bold">{testimonial.name}</p>
                    <p className="text-slate-400 text-sm">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-slate-300 italic">"{testimonial.quote}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Preguntas Frecuentes
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: '¿Necesito experiencia previa?',
                a: 'No, este evento está diseñado para personas de todos los niveles. Ya sea que estés comenzando tu camino de desarrollo personal o ya tengas experiencia, encontrarás valor.'
              },
              {
                q: '¿Qué debo llevar?',
                a: 'Solo necesitas traer una mente abierta y disposición para participar. Te recomendamos llegar 15 minutos antes.'
              },
              {
                q: '¿Hay costo de inscripción?',
                a: isFree ? 'Este evento es completamente GRATUITO. Es nuestra forma de darte a conocer el método de transformación.' : 'El costo incluye todos los materiales y acceso completo al evento.'
              },
              {
                q: '¿Qué pasa si no puedo asistir?',
                a: 'Si no puedes asistir, te pedimos que canceles tu registro para liberar el lugar. Tenemos eventos frecuentemente, así que podrás inscribirte a uno futuro.'
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <span className="text-white font-semibold">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedFaq === index ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-4"
                    >
                      <p className="text-slate-400">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-cyan-500/20 via-violet-500/20 to-purple-500/20 backdrop-blur-sm rounded-3xl border border-cyan-500/30 p-8 md:p-12"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-2xl mb-6">
              <Rocket className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              ¿Listo para Transformar tu Vida?
            </h2>
            
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Este es el primer paso hacia la mejor versión de ti mismo. 
              {spotsLeft !== null && spotsLeft < 20 && (
                <span className="block text-amber-400 font-bold mt-2">
                  ¡Solo quedan {spotsLeft} lugares!
                </span>
              )}
            </p>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowRegisterModal(true)}
              className="px-10 py-5 bg-gradient-to-r from-cyan-500 to-violet-500 text-white rounded-2xl font-bold text-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all flex items-center justify-center gap-3 mx-auto"
            >
              <Sparkles className="w-6 h-6" />
              {isFree ? 'Reservar mi lugar GRATIS' : 'Inscribirme ahora'}
              <ArrowRight className="w-6 h-6" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-4 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} {event.Organization?.name || 'Quantum Matter'}. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* Registration Modal */}
      <AnimatePresence>
        {showRegisterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !registering && setShowRegisterModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-3xl border border-slate-700 p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {registered ? (
                // Success State
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">¡Registro Exitoso!</h3>
                  <p className="text-slate-400 mb-6">
                    Te hemos enviado un correo de confirmación. ¡Nos vemos pronto!
                  </p>
                  <button
                    onClick={() => setShowRegisterModal(false)}
                    className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                // Form State
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Reserva tu Lugar</h3>
                    <p className="text-slate-400 text-sm mt-1">{event.name}</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Nombre completo *
                      </label>
                      <input
                        type="text"
                        value={registerForm.nombre}
                        onChange={(e) => setRegisterForm({ ...registerForm, nombre: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                        placeholder="Tu nombre"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Correo electrónico *
                      </label>
                      <input
                        type="email"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                        placeholder="tu@email.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Teléfono / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={registerForm.telefono}
                        onChange={(e) => setRegisterForm({ ...registerForm, telefono: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                        placeholder="+52 (000) 000-0000"
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        ¿Quién te invitó?
                      </label>
                      {selectedInviter ? (
                        <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 border border-cyan-500/50 rounded-xl">
                          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {selectedInviter.nombre.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white flex-1">{selectedInviter.nombre}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInviter(null);
                              setSearchQuery('');
                            }}
                            className="text-slate-400 hover:text-white transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                              placeholder="Buscar por nombre..."
                            />
                            {searchingUsers && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                              </div>
                            )}
                          </div>
                          
                          {/* Search Results Dropdown */}
                          {showSearchResults && searchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                              {searchResults.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedInviter({ id: user.id, nombre: user.nombre });
                                    setSearchQuery('');
                                    setShowSearchResults(false);
                                  }}
                                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700/50 transition-colors text-left"
                                >
                                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {user.nombre.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{user.nombre}</p>
                                    {user.referralCode && (
                                      <p className="text-slate-400 text-xs truncate font-mono">Código: {user.referralCode}</p>
                                    )}
                                  </div>
                                  {user.isGraduated && (
                                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                                      ✓ Graduado
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && !searchingUsers && (
                            <div className="absolute z-10 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                              <p className="text-slate-400 text-sm">No se encontraron usuarios</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción o selección de pago */}
                  {!showPaymentOptions ? (
                    <div className="mt-6 space-y-3">
                      <button
                        onClick={handleRegister}
                        disabled={registering || !registerForm.nombre.trim() || !registerForm.email.trim()}
                        className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-violet-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Continuar al Pago
                      </button>
                      
                      <button
                        onClick={() => setShowRegisterModal(false)}
                        disabled={registering}
                        className="w-full px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-4">
                      {/* Resumen del precio */}
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-400">Total a pagar:</span>
                          <span className="text-2xl font-bold text-white">{formatPrice(getCurrentPrice())}</span>
                        </div>
                        <p className="text-xs text-slate-500">Impuestos incluidos</p>
                      </div>

                      {/* Opciones de pago */}
                      <div className="space-y-3">
                        <p className="text-sm text-slate-400 font-medium">Selecciona tu método de pago:</p>
                        
                        {/* Stripe - Tarjeta */}
                        <button
                          onClick={() => handlePaymentSelection('stripe')}
                          disabled={registering}
                          className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-cyan-500/50 hover:bg-slate-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
                              <CreditCard className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                                Tarjeta de Crédito/Débito
                              </p>
                              <p className="text-xs text-slate-400">Visa, Mastercard, AMEX</p>
                            </div>
                            {registering && selectedPaymentMethod === 'stripe' ? (
                              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                            ) : (
                              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                            )}
                          </div>
                        </button>

                        {/* MercadoPago - MSI */}
                        <button
                          onClick={() => handlePaymentSelection('mercadopago')}
                          disabled={registering}
                          className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-blue-500/50 hover:bg-slate-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-sky-400 rounded-xl">
                              <Shield className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                                Meses sin Intereses
                              </p>
                              <p className="text-xs text-slate-400">3, 6, 9 o 12 MSI con MercadoPago</p>
                            </div>
                            {registering && selectedPaymentMethod === 'mercadopago' ? (
                              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                            ) : (
                              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                            )}
                          </div>
                        </button>
                      </div>

                      {/* Botón volver */}
                      <button
                        onClick={() => setShowPaymentOptions(false)}
                        disabled={registering}
                        className="w-full px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
