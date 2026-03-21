'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Sparkles,
  Zap,
  Crown,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  Wand2,
  Image as ImageIcon,
  Type,
  Palette,
  Target,
  Star,
  Save,
  Eye,
  Globe,
  ShoppingBag,
  Layout,
  Smartphone,
  Monitor,
  MessageSquare,
  Phone,
  MapPin,
  Clock,
  Instagram,
  Facebook,
  Heart,
  Users,
  Package,
  DollarSign,
  Plus,
  Trash2,
  Edit3,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Share2,
  QrCode,
  TrendingUp,
  Award,
  FileText,
  AlertCircle,
  Briefcase,
  Calendar,
  CalendarDays,
  CalendarClock,
  Video,
  Users2,
  Timer,
  CreditCard,
  Bell,
  Stethoscope,
  Dumbbell,
  Sparkle,
  Brain,
  User,
  Layers,
  Lightbulb,
  Shield,
  ShoppingCart
} from 'lucide-react';

// Tipos
interface QuantumTemplate {
  id: string;
  name: string;
  description: string;
  style: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  characteristics: string[];
  preview: string;
  emoji: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image?: string;
  category?: string;
  inStock: boolean;
  featured: boolean;
}

interface WebContent {
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutText: string;
  servicesTitle: string;
  services: { icon: string; title: string; description: string }[];
  ctaText: string;
  testimonials: { name: string; text: string; rating: number }[];
  // Stats editables
  stat1Value?: string;
  stat1Label?: string;
  stat2Value?: string;
  stat2Label?: string;
}

// ============================================
// TIPOS PARA AGENDA DE SERVICIOS EN LÍNEA
// ============================================
type ServiceModality = 'presencial' | 'virtual' | 'ambos';
type ServiceCapacity = 'individual' | 'grupal';
type AppointmentCategory = 'salud' | 'deporte' | 'esoterico' | 'coaching' | 'belleza' | 'otro';

interface AppointmentService {
  id: string;
  name: string;
  description: string;
  image?: string; // imagen del servicio
  duration: number; // en minutos
  price: number;
  priceType: 'fijo' | 'cotizar';
  modality: ServiceModality;
  capacity: ServiceCapacity;
  maxParticipants?: number; // para servicios grupales
  bufferTime: number; // minutos entre citas
  color: string;
  active: boolean;
  requireDeposit: boolean;
  depositPercentage?: number;
  customQuestions?: { question: string; required: boolean }[];
}

interface AvailabilitySlot {
  day: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
  enabled: boolean;
  slots: { start: string; end: string }[]; // Puede tener múltiples rangos por día
}

interface AvailabilityConfig {
  weeklySchedule: AvailabilitySlot[];
  blockedDates: string[]; // ISO dates
  minAdvanceHours: number; // Mínimo de horas de anticipación
  maxAdvanceDays: number; // Máximo días hacia adelante
  autoConfirm: boolean; // Si es true, las citas se confirman automáticamente
}

interface AppointmentsConfig {
  category: AppointmentCategory;
  services: AppointmentService[];
  availability: AvailabilityConfig;
  address?: string; // Para servicios presenciales
  virtualPlatform: 'zoom' | 'meet' | 'jitsi' | 'whatsapp' | 'manual';
  reminderHours: number; // Horas antes para enviar recordatorio
  enableWaitlist: boolean;
  cancellationPolicy?: string;
  cancellationHours: number; // Horas de anticipación para cancelar
  autoReminders: boolean; // Enviar recordatorios automáticos
}

interface BusinessInfo {
  name: string;
  description: string;
  category: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  schedule: string;
  instagram?: string;
  facebook?: string;
  logo?: string;
}

// Templates del QUANTUM AI WEB ENGINE
const QUANTUM_TEMPLATES: QuantumTemplate[] = [
  {
    id: 'minimalista',
    name: 'Minimalista Elegante',
    description: 'Diseño limpio y sofisticado. Ideal para profesionales, consultores y marcas premium.',
    style: 'minimal',
    colors: {
      primary: '#0f172a',
      secondary: '#64748b',
      accent: '#3b82f6',
      background: '#ffffff',
      text: '#1e293b'
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter'
    },
    characteristics: ['Espacios amplios', 'Tipografía elegante', 'Colores neutros', 'Máxima legibilidad'],
    preview: '/templates/minimal.png',
    emoji: '✨'
  },
  {
    id: 'high-energy',
    name: 'High Energy',
    description: 'Vibrante y dinámico. Perfecto para fitness, coaching, eventos y marcas juveniles.',
    style: 'energetic',
    colors: {
      primary: '#7c3aed',
      secondary: '#ec4899',
      accent: '#f59e0b',
      background: '#0f0f23',
      text: '#ffffff'
    },
    fonts: {
      heading: 'Bebas Neue',
      body: 'Montserrat'
    },
    characteristics: ['Gradientes vibrantes', 'Animaciones dinámicas', 'CTAs prominentes', 'Energía visual'],
    preview: '/templates/energy.png',
    emoji: '⚡'
  },
  {
    id: 'artesanal',
    name: 'Artesanal Cálido',
    description: 'Auténtico y cercano. Ideal para negocios locales, artesanías, café y restaurantes.',
    style: 'artisan',
    colors: {
      primary: '#854d0e',
      secondary: '#a16207',
      accent: '#16a34a',
      background: '#fef3c7',
      text: '#451a03'
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Lora'
    },
    characteristics: ['Texturas naturales', 'Colores tierra', 'Sensación artesanal', 'Calidez y confianza'],
    preview: '/templates/artisan.png',
    emoji: '🌿'
  },
  {
    id: 'tech',
    name: 'Tech Futurista',
    description: 'Innovador y moderno. Para startups, tecnología, apps y servicios digitales.',
    style: 'tech',
    colors: {
      primary: '#06b6d4',
      secondary: '#8b5cf6',
      accent: '#22d3ee',
      background: '#020617',
      text: '#e2e8f0'
    },
    fonts: {
      heading: 'Space Grotesk',
      body: 'DM Sans'
    },
    characteristics: ['Efectos glassmorphism', 'Gradientes futuristas', 'Interfaz moderna', 'Tecnología visual'],
    preview: '/templates/tech.png',
    emoji: '🚀'
  },
  {
    id: 'corporativo',
    name: 'Corporativo Profesional',
    description: 'Confiable y establecido. Para empresas, despachos, servicios profesionales.',
    style: 'corporate',
    colors: {
      primary: '#1e40af',
      secondary: '#3b82f6',
      accent: '#059669',
      background: '#f8fafc',
      text: '#0f172a'
    },
    fonts: {
      heading: 'Poppins',
      body: 'Open Sans'
    },
    characteristics: ['Estructura clara', 'Profesionalismo', 'Confianza visual', 'Credibilidad'],
    preview: '/templates/corporate.png',
    emoji: '🏢'
  }
];

export default function QuantumWebEngine() {
  const router = useRouter();
  
  // Estados del wizard
  const [step, setStep] = useState<'intro' | 'site-type' | 'template' | 'info' | 'content' | 'products' | 'appointments-services' | 'appointments-schedule' | 'preview' | 'published'>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Tipo de sitio: tienda, informativa o citas
  const [siteType, setSiteType] = useState<'store' | 'informative' | 'appointments' | null>(null);
  
  // Datos del negocio (precargados del perfil si existe)
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: '',
    description: '',
    category: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    schedule: '',
    instagram: '',
    facebook: ''
  });
  
  // Template seleccionado
  const [selectedTemplate, setSelectedTemplate] = useState<QuantumTemplate | null>(null);
  
  // Colores personalizados de la marca (3 colores)
  const [brandColors, setBrandColors] = useState<[string, string, string]>(['#1F2937', '#6B7280', '#D1D5DB']);
  
  // Contenido generado por IA
  const [webContent, setWebContent] = useState<WebContent | null>(null);
  
  // Productos
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Preview mode
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  // MODO EDICIÓN - Para editar textos e imágenes inline (activo por defecto)
  const [editMode, setEditMode] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imagePickerField, setImagePickerField] = useState<string | null>(null);
  const [heroImage, setHeroImage] = useState<string>('');
  
  // URL publicada
  const [publishedUrl, setPublishedUrl] = useState('');
  
  // Estado para mostrar errores con diseño
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Modal de mapa para dirección
  const [showMapModal, setShowMapModal] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<{display_name: string; lat: string; lon: string}[]>([]);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLon, setAddressLon] = useState<number | null>(null);
  
  // Modal de horarios
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [horarioConfig, setHorarioConfig] = useState<{
    [key: string]: { abierto: boolean; desde: string; hasta: string }
  }>({
    lunes: { abierto: true, desde: '09:00', hasta: '18:00' },
    martes: { abierto: true, desde: '09:00', hasta: '18:00' },
    miercoles: { abierto: true, desde: '09:00', hasta: '18:00' },
    jueves: { abierto: true, desde: '09:00', hasta: '18:00' },
    viernes: { abierto: true, desde: '09:00', hasta: '18:00' },
    sabado: { abierto: true, desde: '10:00', hasta: '14:00' },
    domingo: { abierto: false, desde: '10:00', hasta: '14:00' },
  });
  
  // ============================================
  // ESTADO PARA AGENDA DE SERVICIOS EN LÍNEA
  // ============================================
  const [appointmentsConfig, setAppointmentsConfig] = useState<AppointmentsConfig>({
    category: 'salud',
    services: [],
    availability: {
      weeklySchedule: [
        { day: 'lunes', enabled: true, slots: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
        { day: 'martes', enabled: true, slots: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
        { day: 'miercoles', enabled: true, slots: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
        { day: 'jueves', enabled: true, slots: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
        { day: 'viernes', enabled: true, slots: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
        { day: 'sabado', enabled: true, slots: [{ start: '10:00', end: '14:00' }] },
        { day: 'domingo', enabled: false, slots: [] },
      ],
      blockedDates: [],
      minAdvanceHours: 24,
      maxAdvanceDays: 30,
      autoConfirm: false,
    },
    virtualPlatform: 'meet',
    reminderHours: 24,
    enableWaitlist: true,
    cancellationHours: 24,
    autoReminders: true,
  });
  
  // Modal para editar/agregar servicios de citas
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<AppointmentService | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(true);
  
  // Panel lateral de configuración en modo edición
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [configPanelTab, setConfigPanelTab] = useState<'colors' | 'services'>('colors');
  
  // Generar string de horario inicial basado en horarioConfig
  const generateHorarioString = (config: typeof horarioConfig): string => {
    const diasCortos: { [key: string]: string } = {
      lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue',
      viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom'
    };
    
    const horarioGroups: { [horario: string]: string[] } = {};
    Object.entries(config).forEach(([dia, cfg]) => {
      if (cfg.abierto) {
        const key = `${cfg.desde}-${cfg.hasta}`;
        if (!horarioGroups[key]) horarioGroups[key] = [];
        horarioGroups[key].push(dia);
      }
    });
    
    return Object.entries(horarioGroups)
      .map(([horario, dias]) => {
        const diasStr = dias.map(d => diasCortos[d] || d).join('-');
        return `${diasStr} ${horario}`;
      })
      .join(', ') || 'Sin horario definido';
  };

  // Sincronizar horarioConfig con businessInfo.schedule
  useEffect(() => {
    const horarioStr = generateHorarioString(horarioConfig);
    setBusinessInfo(prev => ({ ...prev, schedule: horarioStr }));
  }, [horarioConfig]);

  // Sincronizar appointmentsConfig.availability.weeklySchedule con horarioConfig cuando es tipo appointments
  useEffect(() => {
    if (siteType === 'appointments') {
      const newHorarioConfig: typeof horarioConfig = {};
      appointmentsConfig.availability.weeklySchedule.forEach(day => {
        const dayKey = day.day.toLowerCase();
        if (day.enabled && day.slots.length > 0) {
          // Tomar el primer y último slot para simplificar
          const firstSlot = day.slots[0];
          const lastSlot = day.slots[day.slots.length - 1];
          newHorarioConfig[dayKey] = {
            abierto: true,
            desde: firstSlot.start,
            hasta: lastSlot.end
          };
        } else {
          newHorarioConfig[dayKey] = {
            abierto: false,
            desde: '09:00',
            hasta: '18:00'
          };
        }
      });
      setHorarioConfig(newHorarioConfig);
    }
  }, [appointmentsConfig.availability.weeklySchedule, siteType]);
  
  // Cargar datos del perfil existente o del localStorage (idea millonaria)
  useEffect(() => {
    const initializeData = async () => {
      setIsLoadingEdit(true);
      await loadPrefillData();
      await loadBusinessProfile();
      setIsLoadingEdit(false);
    };
    initializeData();
  }, []);
  
  // Cargar datos precargados desde el flujo de "idea millonaria" o modo edición
  const loadPrefillData = async () => {
    try {
      const prefillData = localStorage.getItem('quantum_web_prefill');
      if (prefillData) {
        const data = JSON.parse(prefillData);
        console.log('Datos precargados de mi negocio:', data);
        
        // Mapear categoría del wizard a categoría de Quantum Web
        const categoryMap: Record<string, string> = {
          'servicios-profesionales': 'servicios',
          'salud-bienestar': 'salud',
          'educacion-coaching': 'educacion',
          'tecnologia': 'tecnologia',
          'arte-creatividad': 'arte',
          'gastronomia': 'restaurante',
          'belleza-estetica': 'belleza',
          'hogar-servicios': 'servicios',
          'fitness-deportes': 'fitness',
          'mascotas': 'otro',
          'eventos': 'otro',
          // Categorías directas del optimizador
          'Tecnología': 'tecnologia',
          'Servicios': 'servicios',
          'Restaurante': 'restaurante',
          'Tienda': 'tienda',
          'Belleza': 'belleza',
          'Salud': 'salud',
          'Educación': 'educacion',
          'Fitness': 'fitness',
          'Arte': 'arte',
        };
        
        setBusinessInfo(prev => ({
          ...prev,
          name: data.name || prev.name,
          description: data.description || prev.description,
          category: categoryMap[data.category] || data.category || prev.category,
          logo: data.logo || prev.logo,
          phone: data.phone || prev.phone,
          whatsapp: data.whatsapp || prev.whatsapp,
          address: data.address || prev.address,
          schedule: data.schedule || prev.schedule,
          instagram: data.instagram || prev.instagram,
          facebook: data.facebook || prev.facebook,
          discountOffer: data.discountOffer || prev.discountOffer
        }));
        
        // Limpiar localStorage después de usar
        localStorage.removeItem('quantum_web_prefill');
        
        // Si es modo edición, cargar los datos completos del sitio y esperar
        if (data.editMode && data.existingSlug) {
          await loadExistingSite(data.existingSlug);
          return; // No ejecutar el código de abajo
        }
        
        // Si tiene datos pero NO es modo edición, ir al paso de selección de tipo de sitio
        if (data.name) {
          setStep('site-type');
        }
      }
    } catch (error) {
      console.error('Error cargando datos precargados:', error);
    }
  };
  
  // Cargar datos de un sitio existente para edición
  const loadExistingSite = async (slug: string) => {
    try {
      const response = await fetch('/api/quantum-web/my-site');
      if (response.ok) {
        const data = await response.json();
        if (data.hasSite && data.site) {
          const site = data.site;
          
          // Cargar información del negocio
          setBusinessInfo({
            name: site.businessName || '',
            description: site.businessDescription || '',
            category: site.businessCategory || '',
            logo: site.logoUrl || '',
            phone: site.phone || '',
            whatsapp: site.whatsapp || '',
            email: site.email || '',
            address: site.address || '',
            schedule: site.schedule || '',
            instagram: site.instagram || '',
            facebook: site.facebook || '',
            discountOffer: ''
          });
          
          // Cargar template si existe
          if (site.templateId) {
            const foundTemplate = QUANTUM_TEMPLATES.find(t => t.id === site.templateId);
            if (foundTemplate) {
              setSelectedTemplate(foundTemplate);
            }
          }
          
          // Cargar contenido desde los campos separados
          const loadedContent = {
            heroTitle: site.heroTitle || '',
            heroSubtitle: site.heroSubtitle || '',
            aboutTitle: site.aboutTitle || 'Sobre Nosotros',
            aboutText: site.aboutText || '',
            servicesTitle: site.servicesTitle || 'Nuestros Servicios',
            services: site.services || [],
            ctaText: site.ctaText || '¡Contáctanos!',
            testimonials: site.testimonials || []
          };
          setWebContent(loadedContent);
          
          // Cargar productos si existen
          if (site.products && site.products.length > 0) {
            setProducts(site.products.map((p: any) => ({
              id: p.id?.toString() || `prod-${Date.now()}`,
              name: p.name || '',
              description: p.description || '',
              price: p.price || 0,
              originalPrice: p.originalPrice,
              image: p.image || p.imageUrl || '',
              category: p.category || '',
              inStock: p.inStock !== false,
              featured: p.featured || false
            })));
          }
          
          // Cargar tipo de sitio y servicios de citas
          if (site.siteType) {
            setSiteType(site.siteType);
          } else if (site.products && site.products.length > 0) {
            setSiteType('store');
          } else {
            setSiteType('landing');
          }
          
          // Cargar servicios de citas si existen
          if (site.appointmentServices && site.appointmentServices.length > 0) {
            setAppointmentsConfig(prev => ({
              ...prev,
              services: site.appointmentServices
            }));
          }
          
          // Ir directo a la preview para editar
          setStep('preview');
          // Abrir el panel de configuración automáticamente
          setShowConfigPanel(true);
          setEditMode(true);
          
          // Cargar colores personalizados si existen
          if (site.templateColors) {
            const savedColors = site.templateColors as { primary?: string; secondary?: string; accent?: string };
            if (savedColors.primary && savedColors.secondary && savedColors.accent) {
              setBrandColors([savedColors.primary, savedColors.secondary, savedColors.accent]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error cargando sitio existente:', error);
    }
  };
  
  const loadBusinessProfile = async () => {
    try {
      const response = await fetch('/api/talent-directory/my-profile');
      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          const p = data.profile;
          
          // Mapear categoría de la DB a la categoría del Quantum Web
          let categorySlug = '';
          if (p.category?.slug) {
            categorySlug = p.category.slug;
          } else if (p.categoryId) {
            // Mapeo de IDs comunes a slugs
            const categoryMap: Record<number, string> = {
              1: 'servicios',
              2: 'restaurante',
              3: 'tienda',
              4: 'belleza',
              5: 'salud',
              6: 'educacion',
              7: 'tecnologia',
              8: 'fitness',
              9: 'arte',
            };
            categorySlug = categoryMap[p.categoryId] || 'otro';
          }
          
          setBusinessInfo(prev => ({
            ...prev,
            name: p.headline || p.name || '',
            description: p.description || p.shortDescription || '',
            category: categorySlug || p.category?.slug || '',
            phone: p.whatsappPhone || p.phone || '',
            whatsapp: p.whatsappPhone || p.phone || '',
            email: p.email || '',
            address: p.coverageZone || p.city ? `${p.city || ''}, ${p.state || ''}` : '',
            schedule: p.schedule || '',
            instagram: p.instagram || '',
            facebook: p.facebook || '',
            logo: p.logoUrl || ''
          }));
          
          // Si tiene logo, también guardarlo para el hero
          if (p.logoUrl) {
            setHeroImage(''); // Reset para usar la imagen por categoría
          }
          
          console.log('Perfil cargado:', p.headline, '- Categoría:', categorySlug);
        }
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
    }
  };
  
  // Buscar direcciones con Nominatim
  const searchAddress = async (query: string) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    
    setSearchingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      setAddressSuggestions(data);
    } catch (error) {
      console.error('Error buscando dirección:', error);
    } finally {
      setSearchingAddress(false);
    }
  };
  
  // Obtener ubicación actual
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setAddressLat(latitude);
          setAddressLon(longitude);
          
          // Reverse geocoding
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            if (data.display_name) {
              setBusinessInfo(prev => ({ ...prev, address: data.display_name }));
            }
          } catch (error) {
            console.error('Error en reverse geocoding:', error);
          }
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
          alert('No se pudo obtener tu ubicación. Por favor, permite el acceso a la ubicación.');
        }
      );
    }
  };
  
  // Generar contenido con IA
  const generateContent = async () => {
    if (!selectedTemplate || !businessInfo.name) return;
    
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/quantum-web/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessInfo,
          templateStyle: selectedTemplate.style,
          templateId: selectedTemplate.id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setWebContent(data.content);
      } else {
        // Contenido de fallback si falla la API
        setWebContent({
          heroTitle: `Bienvenido a ${businessInfo.name}`,
          heroSubtitle: businessInfo.description || 'Tu mejor opción para calidad y servicio',
          aboutTitle: 'Sobre Nosotros',
          aboutText: `En ${businessInfo.name} nos dedicamos a brindarte la mejor experiencia. Con años de experiencia en ${businessInfo.category || 'nuestro rubro'}, nos comprometemos a superar tus expectativas.`,
          servicesTitle: 'Nuestros Servicios',
          services: [
            { icon: 'star', title: 'Calidad Premium', description: 'Los mejores estándares en cada detalle' },
            { icon: 'clock', title: 'Atención Personalizada', description: 'Servicio dedicado a tus necesidades' },
            { icon: 'heart', title: 'Satisfacción Garantizada', description: 'Tu felicidad es nuestra prioridad' }
          ],
          ctaText: '¡Contáctanos Ahora!',
          testimonials: [
            { name: 'Cliente Satisfecho', text: 'Excelente servicio y atención', rating: 5 }
          ]
        });
      }
    } catch (error) {
      console.error('Error generando contenido:', error);
      // Fallback
      setWebContent({
        heroTitle: `Bienvenido a ${businessInfo.name}`,
        heroSubtitle: businessInfo.description || 'Tu mejor opción',
        aboutTitle: 'Sobre Nosotros',
        aboutText: `En ${businessInfo.name} nos dedicamos a brindarte lo mejor.`,
        servicesTitle: 'Servicios',
        services: [
          { icon: 'star', title: 'Calidad', description: 'Lo mejor para ti' }
        ],
        ctaText: '¡Contáctanos!',
        testimonials: []
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Publicar sitio
  const publishSite = async () => {
    console.log('Iniciando publicación...');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/quantum-web/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessInfo,
          template: selectedTemplate,
          content: webContent,
          products,
          brandColors,
          siteType,
          appointmentServices: appointmentsConfig.services
        })
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok && data.success) {
        const siteUrl = data.url || `quantummatter.app/site/${data.slug}`;
        setPublishedUrl(siteUrl);
        // Guardar el slug para navegar localmente
        localStorage.setItem('quantum_published_slug', data.slug);
        setStep('published');
        console.log('Publicado exitosamente:', siteUrl);
      } else {
        console.error('Error en respuesta:', data);
        setErrorMessage(data.error || 'Ocurrió un error al publicar tu sitio. Intenta de nuevo.');
        setShowError(true);
      }
    } catch (error) {
      console.error('Error publicando:', error);
      setErrorMessage('Error de conexión. Verifica tu internet e intenta de nuevo.');
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Agregar/editar producto
  const saveProduct = (product: Product) => {
    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === product.id ? product : p));
    } else {
      setProducts(prev => [...prev, { ...product, id: Date.now().toString() }]);
    }
    setShowProductModal(false);
    setEditingProduct(null);
  };
  
  // Eliminar producto
  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };
  
  // ========== RENDER STEPS ==========
  
  // Intro
  const renderIntro = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950/20 to-slate-950 flex items-center justify-center p-4 pt-20"
    >
      <div className="max-w-2xl w-full text-center">
        {/* Logo animado */}
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-32 h-32 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-2xl shadow-blue-500/30"
        >
          <Globe className="w-16 h-16 text-white" />
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-4"
        >
          QUANTUM AI WEB ENGINE
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl text-blue-200 mb-8"
        >
          Crea tu página web profesional con tienda en línea
          <br />
          <span className="text-cyan-400 font-semibold">en menos de 5 minutos</span>
        </motion.p>
        
        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {[
            { icon: Wand2, label: 'IA Genera Todo' },
            { icon: Layout, label: '5 Templates Pro' },
            { icon: ShoppingBag, label: 'Tienda Online' },
            { icon: Smartphone, label: '100% Responsivo' }
          ].map((feature, i) => (
            <div key={i} className="bg-slate-800/50 rounded-2xl p-4 border border-blue-500/20 hover:border-cyan-500/40 transition">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm text-slate-300 font-medium">{feature.label}</p>
            </div>
          ))}
        </motion.div>
        
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setStep('site-type')}
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-lg shadow-2xl shadow-blue-500/30 flex items-center gap-3 mx-auto hover:shadow-cyan-500/50 transition-all"
        >
          <Rocket className="w-6 h-6" />
          Comenzar Ahora
          <ArrowRight className="w-5 h-5" />
        </motion.button>
        
        <p className="text-slate-500 text-sm mt-6">
          Sin código • Sin complicaciones • 100% profesional
        </p>
      </div>
    </motion.div>
  );
  
  // Selección de Tipo de Sitio (Tienda vs Informativa)
  const renderSiteTypeSelection = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-20 pb-8 px-4"
    >
      <div className="max-w-3xl mx-auto text-center">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => setStep('intro')}
            className="text-slate-400 hover:text-white transition mb-4 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            ¿Qué tipo de sitio necesitas? 🎯
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg"
          >
            Selecciona según tus necesidades de negocio
          </motion.p>
        </div>
        
        {/* Options - Layout Horizontal */}
        <div className="space-y-6 max-w-4xl mx-auto">
          
          {/* 1. Tienda Online - Horizontal */}
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.01, y: -3 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              setSiteType('store');
              setStep('template');
            }}
            className={`relative w-full p-6 rounded-3xl border-2 text-left transition-all ${
              siteType === 'store' 
                ? 'border-cyan-500 bg-cyan-500/10' 
                : 'border-slate-700 bg-slate-800/50 hover:border-cyan-500/50'
            }`}
          >
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 flex-shrink-0 mx-auto md:mx-0">
                <ShoppingBag className="w-10 h-10 text-white" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2 text-center md:text-left">Tienda Online</h3>
                <p className="text-slate-400 mb-4 text-center md:text-left">
                  Vende tus productos o servicios creados por ti directamente desde tu sitio web
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                  {[
                    'Catálogo de productos propios',
                    'Precios y descripciones',
                    'Botón de WhatsApp para comprar',
                    'Galería de imágenes',
                    'Ideal para: artesanos, chefs, diseñadores, creadores'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-cyan-400" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="py-2 px-4 rounded-xl bg-green-500/20 text-green-400 font-semibold text-center">
                    Incluye Catálogo de Productos
                  </div>
                  <div className="py-2 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                    <p className="text-xs text-amber-300/90">
                      ⚠️ <strong>Uso exclusivo:</strong> Solo productos fabricados o hechos por ti
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.button>
          
          {/* 2. Página Informativa - Horizontal */}
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.01, y: -3 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              setSiteType('informative');
              setStep('template');
            }}
            className={`relative w-full p-6 rounded-3xl border-2 text-left transition-all ${
              siteType === 'informative' 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-slate-700 bg-slate-800/50 hover:border-blue-500/50'
            }`}
          >
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 flex-shrink-0 mx-auto md:mx-0">
                <FileText className="w-10 h-10 text-white" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2 text-center md:text-left">Página Informativa</h3>
                <p className="text-slate-400 mb-4 text-center md:text-left">
                  Presenta tu negocio, servicios y datos de contacto de forma profesional
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                  {[
                    'Información de tu negocio',
                    'Servicios que ofreces',
                    'Sobre nosotros',
                    'Datos de contacto',
                    'Ideal para: profesionales, consultores, agencias'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-blue-400" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
                
                <div className="py-2 px-4 rounded-xl bg-blue-500/20 text-blue-400 font-semibold text-center md:text-left inline-block">
                  Servicios Cotizador en linea
                </div>
              </div>
            </div>
          </motion.button>
          
          {/* 3. Agenda de Servicios en Línea - Horizontal (ya estaba) */}
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.01, y: -3 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              setSiteType('appointments');
              setStep('template');
            }}
            className={`relative w-full p-6 rounded-3xl border-2 text-left transition-all ${
              siteType === 'appointments' 
                ? 'border-cyan-500 bg-cyan-500/10' 
                : 'border-slate-700 bg-slate-800/50 hover:border-cyan-500/50'
            }`}
          >
            {/* Badge NUEVO */}
            <div className="absolute -top-3 left-6 md:left-1/2 md:-translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full text-white text-xs font-bold shadow-lg">
              ✨ NUEVO
            </div>
            
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-blue-500/30 flex-shrink-0 mx-auto md:mx-0">
                <CalendarClock className="w-12 h-12 text-white" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2 text-center md:text-left">Agenda de Servicios en Línea</h3>
                <p className="text-slate-400 mb-4 text-center md:text-left">
                  Sistema completo de agenda, reservas y gestión de clientes. Ideal para profesionales de salud, coaches, deportes, belleza y más.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { icon: Calendar, label: 'Agenda Online' },
                    { icon: Clock, label: 'Horarios Flexibles' },
                    { icon: Users, label: 'Gestión de Clientes' },
                    { icon: Video, label: 'Citas Virtuales' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-cyan-300">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { icon: Stethoscope, label: 'Salud', color: 'bg-blue-500/20 text-blue-400' },
                    { icon: Dumbbell, label: 'Deporte', color: 'bg-cyan-500/20 text-cyan-400' },
                    { icon: Sparkle, label: 'Bienestar', color: 'bg-blue-600/20 text-blue-300' },
                    { icon: Brain, label: 'Coaching', color: 'bg-cyan-600/20 text-cyan-300' },
                  ].map((cat, i) => (
                    <span key={i} className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${cat.color}`}>
                      <cat.icon className="w-3 h-3" />
                      {cat.label}
                    </span>
                  ))}
                </div>
                
                <div className="py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-500/20 text-cyan-300 font-semibold text-center border border-cyan-500/30">
                  📅 Reservas + 👥 CRM + 🔔 Recordatorios
                </div>
              </div>
            </div>
          </motion.button>
        </div>
        
        {/* Note */}
        <p className="text-slate-500 text-sm text-center mt-8">
          💡 No te preocupes, podrás cambiar esto después
        </p>
      </div>
    </motion.div>
  );

  // ============================================================
  // AGENDA DE SERVICIOS - Configuración de Servicios
  // ============================================================
  
  const handleAddService = (service: Omit<AppointmentService, 'id'>) => {
    const newService: AppointmentService = {
      ...service,
      id: `service-${Date.now()}`,
    };
    setAppointmentsConfig(prev => ({
      ...prev,
      services: [...prev.services, newService]
    }));
    setShowServiceModal(false);
  };

  const handleUpdateService = (service: AppointmentService) => {
    setAppointmentsConfig(prev => ({
      ...prev,
      services: prev.services.map(s => s.id === service.id ? service : s)
    }));
    setShowServiceModal(false);
    setEditingService(null);
  };

  const handleDeleteService = (id: string) => {
    setAppointmentsConfig(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id)
    }));
  };

  const ServiceModal = () => {
    const [formData, setFormData] = useState<Omit<AppointmentService, 'id'>>({
      name: editingService?.name || '',
      description: editingService?.description || '',
      image: editingService?.image || '',
      duration: editingService?.duration || 60,
      price: editingService?.price || 0,
      priceType: editingService?.priceType || 'fijo',
      modality: editingService?.modality || 'presencial',
      capacity: editingService?.capacity || 'individual',
      maxParticipants: editingService?.maxParticipants || 1,
      bufferTime: editingService?.bufferTime || 15,
      color: editingService?.color || '#8B5CF6',
      active: editingService?.active ?? true,
      requireDeposit: editingService?.requireDeposit ?? false,
    });
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const serviceImageInputRef = useRef<HTMLInputElement>(null);

    const durations = [15, 30, 45, 60, 90, 120, 180];
    const colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

    const handleServiceImageUpload = async (file: File) => {
      setIsUploadingImage(true);
      try {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('folder', 'services');
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        });
        
        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({ ...prev, image: data.url }));
        }
      } catch (error) {
        console.error('Error uploading image:', error);
      } finally {
        setIsUploadingImage(false);
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => { setShowServiceModal(false); setEditingService(null); }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-700 p-6 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">
              {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h3>
            <button
              onClick={() => { setShowServiceModal(false); setEditingService(null); }}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Nombre del servicio */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre del Servicio *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Consulta General, Clase de Yoga, Sesión de Coaching..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe brevemente tu servicio..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Imagen del servicio */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Imagen del Servicio (opcional)
                <span className="text-xs text-slate-500 ml-2">• Tamaño ideal: 800x400px</span>
              </label>
              <input
                ref={serviceImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleServiceImageUpload(file);
                }}
              />
              {formData.image ? (
                <div className="relative group">
                  <img
                    src={formData.image}
                    alt="Imagen del servicio"
                    className="w-full h-32 object-cover rounded-xl border border-slate-700"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => serviceImageInputRef.current?.click()}
                      className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                      className="p-2 bg-red-600 rounded-lg text-white hover:bg-red-700 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => serviceImageInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="w-full h-32 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all disabled:opacity-50"
                >
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                      <span className="text-sm text-slate-400">Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                      <span className="text-sm text-slate-400">Agregar imagen</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Duración y Precio */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Duración
                </label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {durations.map(d => (
                    <option key={d} value={d}>
                      {d >= 60 ? `${d / 60}h ${d % 60 > 0 ? `${d % 60}min` : ''}` : `${d} min`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Precio (MXN)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.price === 0 ? '' : formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  placeholder="0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Modalidad */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Modalidad
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'presencial' as const, label: 'Presencial', icon: MapPin },
                  { value: 'virtual' as const, label: 'Virtual', icon: Video },
                  { value: 'ambos' as const, label: 'Ambos', icon: Globe },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, modality: opt.value })}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      formData.modality === opt.value
                        ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <opt.icon className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Capacidad */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tipo de Sesión
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'individual' as const, label: 'Individual', icon: User },
                  { value: 'grupal' as const, label: 'Grupal', icon: Users2 },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, capacity: opt.value, maxParticipants: opt.value === 'individual' ? 1 : 10 })}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      formData.capacity === opt.value
                        ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <opt.icon className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs">{opt.label}</span>
                  </button>
                ))}
              </div>
              {formData.capacity === 'grupal' && (
                <div className="mt-3">
                  <label className="block text-xs text-slate-400 mb-1">
                    Máx. Participantes
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 2 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm"
                  />
                </div>
              )}
            </div>

            {/* Tiempo Buffer */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tiempo entre citas (buffer)
              </label>
              <select
                value={formData.bufferTime}
                onChange={(e) => setFormData({ ...formData, bufferTime: parseInt(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                {[0, 5, 10, 15, 30, 45, 60].map(t => (
                  <option key={t} value={t}>{t === 0 ? 'Sin tiempo buffer' : `${t} minutos`}</option>
                ))}
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Color del Servicio
              </label>
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      formData.color === color ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => { setShowServiceModal(false); setEditingService(null); }}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!formData.name.trim()) return;
                if (editingService) {
                  handleUpdateService({ ...formData, id: editingService.id });
                } else {
                  handleAddService(formData);
                }
              }}
              disabled={!formData.name.trim()}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:from-blue-700 hover:to-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingService ? 'Guardar Cambios' : 'Agregar Servicio'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderAppointmentsServices = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-20 pb-8 px-4"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/30"
          >
            <CalendarClock className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-3">Configura tus Servicios</h1>
          <p className="text-slate-400 text-lg">
            Agrega los servicios o citas que ofreces. Podrás configurar precios, duración y más.
          </p>
        </div>

        {/* Category Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            ¿Cuál es tu categoría principal?
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { value: 'salud' as const, label: 'Salud', icon: Stethoscope, color: 'from-blue-500 to-blue-600' },
              { value: 'deporte' as const, label: 'Deporte', icon: Dumbbell, color: 'from-cyan-500 to-cyan-600' },
              { value: 'esoterico' as const, label: 'Bienestar', icon: Sparkle, color: 'from-blue-600 to-cyan-600' },
              { value: 'coaching' as const, label: 'Coaching', icon: Brain, color: 'from-blue-500 to-cyan-500' },
              { value: 'belleza' as const, label: 'Belleza', icon: Sparkles, color: 'from-cyan-600 to-blue-500' },
              { value: 'otro' as const, label: 'Otro', icon: Layers, color: 'from-slate-500 to-slate-600' },
            ].map((cat) => (
              <button
                key={cat.value}
                onClick={() => setAppointmentsConfig(prev => ({ ...prev, category: cat.value }))}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  appointmentsConfig.category === cat.value
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mx-auto mb-2`}>
                  <cat.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-white">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Virtual Platform Selection */}
        {appointmentsConfig.services.some(s => s.modality !== 'presencial') && (
          <div className="mb-8 p-4 rounded-2xl bg-slate-800/50 border border-slate-700">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              <Video className="w-4 h-4 inline mr-2" />
              Plataforma para citas virtuales
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {([
                { key: 'zoom' as const, label: 'Zoom' },
                { key: 'meet' as const, label: 'Google Meet' },
                { key: 'whatsapp' as const, label: 'WhatsApp' },
                { key: 'manual' as const, label: 'Manual' },
              ]).map((platform) => (
                <button
                  key={platform.key}
                  onClick={() => setAppointmentsConfig(prev => ({ ...prev, virtualPlatform: platform.key }))}
                  className={`py-2 px-4 rounded-xl text-sm transition-all ${
                    appointmentsConfig.virtualPlatform === platform.key
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {platform.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Services List */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Tus Servicios ({appointmentsConfig.services.length})
            </h2>
            <button
              onClick={() => { setEditingService(null); setShowServiceModal(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar Servicio
            </button>
          </div>

          {appointmentsConfig.services.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-12 rounded-3xl border-2 border-dashed border-slate-700 text-center"
            >
              <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-400 mb-2">
                No tienes servicios aún
              </h3>
              <p className="text-slate-500 mb-6">
                Agrega tus servicios, citas o clases para que tus clientes puedan reservar
              </p>
              <button
                onClick={() => setShowServiceModal(true)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:from-blue-700 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/25"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                Agregar Mi Primer Servicio
              </button>
              <p className="text-slate-500 text-sm mt-4">
                💡 También puedes continuar y agregar servicios después
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {appointmentsConfig.services.map((service) => (
                  <motion.div
                    key={service.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700 hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {/* Color indicator */}
                      <div 
                        className="w-3 h-16 rounded-full flex-shrink-0"
                        style={{ backgroundColor: service.color }}
                      />
                      
                      {/* Service Info */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{service.name}</h3>
                        {service.description && (
                          <p className="text-sm text-slate-400 line-clamp-1">{service.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Timer className="w-3 h-3" />
                            {service.duration} min
                          </span>
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <CreditCard className="w-3 h-3" />
                            {service.price === 0 ? 'Solicitar Cotización' : `$${service.price.toLocaleString()} MXN`}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            service.modality === 'presencial' ? 'bg-blue-500/20 text-blue-400' :
                            service.modality === 'virtual' ? 'bg-cyan-500/20 text-cyan-400' :
                            'bg-cyan-500/20 text-cyan-400'
                          }`}>
                            {service.modality === 'presencial' ? '📍 Presencial' :
                             service.modality === 'virtual' ? '🎥 Virtual' : '🔄 Híbrido'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            service.capacity === 'individual' 
                              ? 'bg-slate-500/20 text-slate-400'
                              : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {service.capacity === 'individual' ? '👤 Individual' : `👥 Grupal (${service.maxParticipants})`}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingService(service); setShowServiceModal(true); }}
                          className="p-2 hover:bg-slate-700 rounded-xl transition-colors"
                        >
                          <Edit3 className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="p-2 hover:bg-red-500/20 rounded-xl transition-colors group"
                        >
                          <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-slate-800">
          <button
            onClick={() => setStep('template')}
            className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            ← Volver
          </button>
          <div className="flex items-center gap-3">
            {appointmentsConfig.services.length === 0 && (
              <span className="text-slate-500 text-sm hidden sm:block">
                Puedes agregar servicios después
              </span>
            )}
            <button
              onClick={() => setStep('appointments-schedule')}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:from-blue-700 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/25"
            >
              {appointmentsConfig.services.length === 0 ? 'Continuar sin servicios →' : 'Configurar Horarios →'}
            </button>
          </div>
        </div>
      </div>

      {/* Service Modal */}
      <AnimatePresence>
        {showServiceModal && <ServiceModal />}
      </AnimatePresence>
    </motion.div>
  );

  // ============================================================
  // AGENDA DE SERVICIOS - Configuración de Disponibilidad
  // ============================================================

  const toggleDayEnabled = (dayIndex: number) => {
    setAppointmentsConfig(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        weeklySchedule: prev.availability.weeklySchedule.map((day, i) => 
          i === dayIndex ? { ...day, enabled: !day.enabled } : day
        )
      }
    }));
  };

  const updateDaySlots = (dayIndex: number, slots: { start: string; end: string }[]) => {
    setAppointmentsConfig(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        weeklySchedule: prev.availability.weeklySchedule.map((day, i) => 
          i === dayIndex ? { ...day, slots } : day
        )
      }
    }));
  };

  const renderAppointmentsSchedule = () => {
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-20 pb-8 px-4"
      >
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/30"
            >
              <CalendarDays className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-3">Configura tu Disponibilidad</h1>
            <p className="text-slate-400 text-lg">
              Define los días y horarios en que puedes atender citas
            </p>
          </div>

          {/* Weekly Schedule */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Horario Semanal
            </h2>
            
            <div className="space-y-3">
              {appointmentsConfig.availability.weeklySchedule.map((day, index) => (
                <div 
                  key={day.day}
                  className={`p-3 sm:p-4 rounded-2xl border transition-all ${
                    day.enabled 
                      ? 'bg-slate-800/70 border-slate-700' 
                      : 'bg-slate-900/50 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                      <button
                        onClick={() => toggleDayEnabled(index)}
                        className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${
                          day.enabled ? 'bg-cyan-500' : 'bg-slate-700'
                        }`}
                      >
                        <motion.div 
                          animate={{ x: day.enabled ? 24 : 2 }}
                          className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                        />
                      </button>
                      <span className={`font-medium text-sm sm:text-base ${day.enabled ? 'text-white' : 'text-slate-500'}`}>
                        {dayNames[index]}
                      </span>
                    </div>
                    
                    {day.enabled && (
                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        {day.slots.map((slot, slotIndex) => (
                          <div key={slotIndex} className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/50 rounded-lg p-1.5 sm:p-0 sm:bg-transparent">
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) => {
                                const newSlots = [...day.slots];
                                newSlots[slotIndex] = { ...slot, start: e.target.value };
                                updateDaySlots(index, newSlots);
                              }}
                              className="bg-slate-700 border border-slate-600 rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 text-white text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 w-[85px] sm:w-auto"
                            />
                            <span className="text-slate-500 text-xs sm:text-sm">a</span>
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) => {
                                const newSlots = [...day.slots];
                                newSlots[slotIndex] = { ...slot, end: e.target.value };
                                updateDaySlots(index, newSlots);
                              }}
                              className="bg-slate-700 border border-slate-600 rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 text-white text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 w-[85px] sm:w-auto"
                            />
                            {day.slots.length > 1 && (
                              <button
                                onClick={() => {
                                  const newSlots = day.slots.filter((_, i) => i !== slotIndex);
                                  updateDaySlots(index, newSlots);
                                }}
                                className="p-1 hover:bg-red-500/20 rounded-lg transition-colors flex-shrink-0"
                              >
                                <X className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newSlots = [...day.slots, { start: '14:00', end: '18:00' }];
                            updateDaySlots(index, newSlots);
                          }}
                          className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex-shrink-0"
                          title="Agregar otro horario"
                        >
                          <Plus className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Settings */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Minimum Advance Notice */}
            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                <Timer className="w-4 h-4 inline mr-2 text-blue-400" />
                Anticipación mínima para reservar
              </label>
              <select
                value={appointmentsConfig.availability.minAdvanceHours}
                onChange={(e) => setAppointmentsConfig(prev => ({
                  ...prev,
                  availability: {
                    ...prev.availability,
                    minAdvanceHours: parseInt(e.target.value)
                  }
                }))}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500"
              >
                <option value={1}>1 hora antes</option>
                <option value={2}>2 horas antes</option>
                <option value={4}>4 horas antes</option>
                <option value={12}>12 horas antes</option>
                <option value={24}>24 horas antes</option>
                <option value={48}>48 horas antes</option>
              </select>
            </div>

            {/* Max Advance Days */}
            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                <CalendarDays className="w-4 h-4 inline mr-2 text-cyan-400" />
                ¿Con cuánta anticipación pueden reservar?
              </label>
              <select
                value={appointmentsConfig.availability.maxAdvanceDays}
                onChange={(e) => setAppointmentsConfig(prev => ({
                  ...prev,
                  availability: {
                    ...prev.availability,
                    maxAdvanceDays: parseInt(e.target.value)
                  }
                }))}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500"
              >
                <option value={7}>1 semana</option>
                <option value={14}>2 semanas</option>
                <option value={30}>1 mes</option>
                <option value={60}>2 meses</option>
                <option value={90}>3 meses</option>
              </select>
            </div>

            {/* Cancellation Policy */}
            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                <Bell className="w-4 h-4 inline mr-2 text-yellow-400" />
                Política de cancelación
              </label>
              <select
                value={appointmentsConfig.cancellationHours}
                onChange={(e) => setAppointmentsConfig(prev => ({
                  ...prev,
                  cancellationHours: parseInt(e.target.value)
                }))}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500"
              >
                <option value={0}>Sin restricción</option>
                <option value={2}>2 horas de anticipación</option>
                <option value={4}>4 horas de anticipación</option>
                <option value={12}>12 horas de anticipación</option>
                <option value={24}>24 horas de anticipación</option>
                <option value={48}>48 horas de anticipación</option>
              </select>
            </div>

            {/* Auto Reminders */}
            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    <Bell className="w-4 h-4 inline mr-2 text-green-400" />
                    Recordatorios automáticos
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    Enviar recordatorios por WhatsApp/Email
                  </p>
                </div>
                <button
                  onClick={() => setAppointmentsConfig(prev => ({
                    ...prev,
                    autoReminders: !prev.autoReminders
                  }))}
                  className={`w-12 h-6 rounded-full relative transition-colors ${
                    appointmentsConfig.autoReminders ? 'bg-green-500' : 'bg-slate-700'
                  }`}
                >
                  <motion.div 
                    animate={{ x: appointmentsConfig.autoReminders ? 24 : 2 }}
                    className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-cyan-500/30 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">📋 Resumen de tu Configuración</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-xl bg-slate-900/50">
                <p className="text-2xl font-bold text-cyan-400">{appointmentsConfig.services.length}</p>
                <p className="text-sm text-slate-400">Servicios</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-900/50">
                <p className="text-2xl font-bold text-blue-400">
                  {appointmentsConfig.availability.weeklySchedule.filter(d => d.enabled).length}
                </p>
                <p className="text-sm text-slate-400">Días disponibles</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-900/50">
                <p className="text-2xl font-bold text-green-400">
                  {appointmentsConfig.services.some(s => s.modality !== 'presencial') ? '🌐' : '📍'}
                </p>
                <p className="text-sm text-slate-400">
                  {appointmentsConfig.services.some(s => s.modality !== 'presencial') ? 'Citas Virtuales' : 'Solo Presencial'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-800">
            <button
              onClick={() => setStep('appointments-services')}
              className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              ← Volver a Servicios
            </button>
            <button
              onClick={() => setStep('info')}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:from-blue-700 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/25"
            >
              Continuar →
            </button>
          </div>
        </div>
      </motion.div>
    );
  };
  
  // Selección de Template
  const renderTemplateSelection = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-20 pb-8 px-4"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <button
            onClick={() => setStep('site-type')}
            className="text-slate-400 hover:text-white transition mb-4 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          
          <h2 className="text-3xl font-bold text-white mb-3">
            Elige tu Estilo ✨
          </h2>
          <p className="text-slate-400">
            Selecciona el diseño que mejor represente tu marca
          </p>
        </div>
        
        {/* Selector de 3 Colores de Marca */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-10 p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50"
        >
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <Palette className="w-5 h-5 text-cyan-400" />
            Colores de tu Marca
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            Haz clic en cada color para personalizarlo, o selecciona una paleta sugerida.
          </p>
          
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Los 3 colores */}
            <div className="flex gap-4">
              {(['Color Principal', 'Color Secundario', 'Color Acento'] as const).map((label, i) => (
                <div key={i} className="text-center">
                  <label className="block text-xs text-slate-400 mb-2">{label}</label>
                  <div className="relative">
                    <input
                      type="color"
                      value={brandColors[i]}
                      onChange={(e) => {
                        const newColors = [...brandColors] as [string, string, string];
                        newColors[i] = e.target.value;
                        setBrandColors(newColors);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div 
                      className="w-16 h-16 rounded-xl border-2 border-white/20 shadow-lg cursor-pointer hover:scale-105 transition"
                      style={{ backgroundColor: brandColors[i] }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 mt-1 block">{brandColors[i]}</span>
                </div>
              ))}
            </div>
            
            {/* Preview de cómo se verían */}
            <div className="flex-1 p-4 rounded-xl bg-slate-900/50 border border-slate-700/30">
              <p className="text-xs text-slate-500 mb-3">Vista previa:</p>
              <div className="flex items-center gap-3">
                <div 
                  className="px-4 py-2 rounded-lg font-semibold text-white text-sm"
                  style={{ backgroundColor: brandColors[0] }}
                >
                  Botón Principal
                </div>
                <div 
                  className="px-4 py-2 rounded-lg font-semibold text-white text-sm"
                  style={{ backgroundColor: brandColors[1] }}
                >
                  Secundario
                </div>
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: brandColors[2] }}
                >
                  <Sparkle className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
            
            {/* Paletas predefinidas */}
            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-500">Paletas sugeridas:</p>
              <div className="flex gap-2">
                {[
                  ['#EC4899', '#8B5CF6', '#F97316'], // Rosa-Púrpura-Naranja
                  ['#10B981', '#3B82F6', '#F59E0B'], // Verde-Azul-Ámbar
                  ['#EF4444', '#F97316', '#FBBF24'], // Rojo-Naranja-Amarillo
                  ['#06B6D4', '#8B5CF6', '#EC4899'], // Cyan-Púrpura-Rosa
                  ['#6B7280', '#9CA3AF', '#D1D5DB'], // Gris (neutro)
                ].map((palette, i) => (
                  <button
                    key={i}
                    onClick={() => setBrandColors(palette as [string, string, string])}
                    className="flex rounded-lg overflow-hidden border-2 border-transparent hover:border-white/30 transition"
                  >
                    {palette.map((color, j) => (
                      <div key={j} className="w-5 h-8" style={{ backgroundColor: color }} />
                    ))}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {QUANTUM_TEMPLATES.map((template) => (
            <motion.div
              key={template.id}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedTemplate(template)}
              className={`cursor-pointer rounded-2xl overflow-hidden border-2 transition-all ${
                selectedTemplate?.id === template.id
                  ? 'border-cyan-500 shadow-xl shadow-blue-500/20'
                  : 'border-slate-700/50 hover:border-slate-600'
              }`}
            >
              {/* Preview */}
              <div 
                className="h-48 relative"
                style={{ backgroundColor: template.colors.background }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl"
                    style={{ backgroundColor: template.colors.primary + '20' }}
                  >
                    {template.emoji}
                  </div>
                </div>
                
                {/* Color swatches */}
                <div className="absolute bottom-3 left-3 flex gap-1">
                  {Object.values(template.colors).slice(0, 4).map((color, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border-2 border-white/20"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                
                {/* Selection indicator */}
                {selectedTemplate?.id === template.id && (
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="bg-slate-800/80 p-5">
                <h3 className="text-lg font-bold text-white mb-2">{template.name}</h3>
                <p className="text-sm text-slate-400 mb-3">{template.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  {template.characteristics.slice(0, 2).map((char, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded-full bg-slate-700/50 text-slate-300"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Continue Button */}
        {selectedTemplate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 left-0 right-0 px-4"
          >
            <div className="max-w-md mx-auto">
              <button
                onClick={() => {
                  // Si es Appointments, primero configurar servicios
                  if (siteType === 'appointments') {
                    setStep('appointments-services');
                  } else {
                    setStep('info');
                  }
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-lg shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3"
              >
                Continuar con {selectedTemplate.name}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
  
  // Información del Negocio
  const renderBusinessInfo = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-20 pb-8 px-4"
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => setStep('template')}
            className="text-slate-400 hover:text-white transition mb-4 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Cambiar template
          </button>
          
          <h2 className="text-3xl font-bold text-white mb-3">
            Cuéntanos de tu Negocio 📋
          </h2>
          <p className="text-slate-400">
            Esta información aparecerá en tu sitio web
          </p>
        </div>
        
        {/* Form */}
        <div className="space-y-6 bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
          {/* Nombre */}
          <div>
            <label className="block text-sm text-slate-300 mb-2 font-medium">
              Nombre del Negocio *
            </label>
            <input
              type="text"
              value={businessInfo.name}
              onChange={(e) => setBusinessInfo(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Café El Buen Sabor"
              className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition"
            />
          </div>
          
          {/* Descripción */}
          <div>
            <label className="block text-sm text-slate-300 mb-2 font-medium">
              Descripción Corta *
            </label>
            <textarea
              value={businessInfo.description}
              onChange={(e) => setBusinessInfo(prev => ({ ...prev, description: e.target.value }))}
              placeholder="¿Qué hace tu negocio especial?"
              rows={3}
              className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition resize-none"
            />
          </div>
          
          {/* Categoría */}
          <div>
            <label className="block text-sm text-slate-300 mb-2 font-medium">
              Categoría / Giro
            </label>
            <select
              value={businessInfo.category}
              onChange={(e) => setBusinessInfo(prev => ({ ...prev, category: e.target.value }))}
              className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white focus:border-cyan-500 transition"
            >
              <option value="">Selecciona una categoría</option>
              <option value="restaurante">Restaurante / Café</option>
              <option value="tienda">Tienda / Comercio</option>
              <option value="servicios">Servicios Profesionales</option>
              <option value="salud">Salud y Bienestar</option>
              <option value="belleza">Belleza y Estética</option>
              <option value="educacion">Educación / Coaching</option>
              <option value="tecnologia">Tecnología</option>
              <option value="fitness">Fitness / Deportes</option>
              <option value="arte">Arte / Creativos</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          
          {/* Contacto */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">
                <Phone className="w-4 h-4 inline mr-1" />
                Teléfono
              </label>
              <input
                type="tel"
                value={businessInfo.phone}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="55 1234 5678"
                className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-cyan-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                WhatsApp
              </label>
              <input
                type="tel"
                value={businessInfo.whatsapp}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="55 1234 5678"
                className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-cyan-500 transition"
              />
            </div>
          </div>
          
          {/* Dirección */}
          <div>
            <label className="block text-sm text-slate-300 mb-2 font-medium">
              <MapPin className="w-4 h-4 inline mr-1" />
              Dirección
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={businessInfo.address}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Calle, Número, Colonia, Ciudad"
                className="flex-1 p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-cyan-500 transition"
              />
            </div>
          </div>
          
          {/* Horario */}
          <div>
            <label className="block text-sm text-slate-300 mb-2 font-medium">
              <Clock className="w-4 h-4 inline mr-1" />
              Horario
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={businessInfo.schedule}
                readOnly
                onClick={() => setShowHorarioModal(true)}
                placeholder="Configura tu horario de atención"
                className="flex-1 p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 cursor-pointer hover:border-cyan-500/50 transition"
              />
              <button
                type="button"
                onClick={() => setShowHorarioModal(true)}
                className="px-4 py-3 rounded-xl bg-blue-600/20 border border-cyan-500/30 text-cyan-400 hover:bg-blue-600/30 transition-colors"
                title="Configurar horario"
              >
                <Clock className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Redes Sociales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">
                <Instagram className="w-4 h-4 inline mr-1" />
                Instagram
              </label>
              <input
                type="text"
                value={businessInfo.instagram || ''}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, instagram: e.target.value }))}
                placeholder="@tunegocio"
                className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-cyan-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">
                <Facebook className="w-4 h-4 inline mr-1" />
                Facebook
              </label>
              <input
                type="text"
                value={businessInfo.facebook || ''}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, facebook: e.target.value }))}
                placeholder="facebook.com/tunegocio"
                className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-cyan-500 transition"
              />
            </div>
          </div>
        </div>
        
        {/* Continue Button */}
        <div className="mt-8">
          <button
            onClick={() => {
              generateContent();
              setStep('content');
            }}
            disabled={!businessInfo.name || !businessInfo.description}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wand2 className="w-5 h-5" />
            Generar Contenido con IA
            <Sparkles className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
  
  // Edición de Contenido
  const renderContentEditor = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-20 pb-8 px-4"
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => setStep('info')}
            className="text-slate-400 hover:text-white transition mb-4 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Editar información
          </button>
          
          <h2 className="text-3xl font-bold text-white mb-3">
            Personaliza tu Contenido ✏️
          </h2>
          <p className="text-slate-400">
            La IA generó este contenido, ¡edítalo a tu gusto!
          </p>
        </div>
        
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 mb-4 rounded-2xl overflow-hidden bg-black">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              >
                <source src="/quantum-logo.mp4" type="video/mp4" />
              </video>
            </div>
            <p className="text-cyan-300 font-medium">Generando contenido con IA...</p>
            <p className="text-slate-500 text-sm mt-2">Esto tomará unos segundos</p>
          </div>
        ) : webContent ? (
          <div className="space-y-6">
            {/* Hero Section */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-cyan-400" />
                Sección Principal (Hero)
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Título Principal</label>
                  <input
                    type="text"
                    value={webContent.heroTitle}
                    onChange={(e) => setWebContent(prev => prev ? { ...prev, heroTitle: e.target.value } : null)}
                    className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white text-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Subtítulo</label>
                  <input
                    type="text"
                    value={webContent.heroSubtitle}
                    onChange={(e) => setWebContent(prev => prev ? { ...prev, heroSubtitle: e.target.value } : null)}
                    className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white"
                  />
                </div>
              </div>
            </div>
            
            {/* About Section */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Sección Sobre Nosotros
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Título</label>
                  <input
                    type="text"
                    value={webContent.aboutTitle}
                    onChange={(e) => setWebContent(prev => prev ? { ...prev, aboutTitle: e.target.value } : null)}
                    className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Texto</label>
                  <textarea
                    value={webContent.aboutText}
                    onChange={(e) => setWebContent(prev => prev ? { ...prev, aboutText: e.target.value } : null)}
                    rows={4}
                    className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white resize-none"
                  />
                </div>
              </div>
            </div>
            
            {/* CTA */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-green-400" />
                Llamada a la Acción
              </h3>
              
              <div>
                <label className="block text-sm text-slate-400 mb-2">Texto del Botón Principal</label>
                <input
                  type="text"
                  value={webContent.ctaText}
                  onChange={(e) => setWebContent(prev => prev ? { ...prev, ctaText: e.target.value } : null)}
                  className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white"
                />
              </div>
            </div>
            
            {/* Regenerate Button */}
            <button
              onClick={generateContent}
              className="w-full py-3 rounded-xl border border-cyan-500/50 text-cyan-400 font-medium hover:bg-cyan-500/10 transition flex items-center justify-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Regenerar Todo con IA
            </button>
          </div>
        ) : null}
        
        {/* Continue Button */}
        {webContent && (
          <div className="mt-8">
            {siteType === 'store' ? (
              <>
                <button
                  onClick={() => setStep('products')}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Agregar Productos
                  <ArrowRight className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setStep('preview')}
                  className="w-full mt-3 py-3 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-800 transition"
                >
                  Saltar y Ver Preview
                </button>
              </>
            ) : (
              <button
                onClick={() => setStep('preview')}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3"
              >
                <Eye className="w-5 h-5" />
                Ver Preview
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
  
  // Productos
  const renderProducts = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-20 pb-8 px-4"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => setStep('content')}
            className="text-slate-400 hover:text-white transition mb-4 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al contenido
          </button>
          
          <h2 className="text-3xl font-bold text-white mb-3">
            Agrega tus Productos 🛍️
          </h2>
          <p className="text-slate-400">
            Crea tu catálogo de productos o servicios
          </p>
        </div>
        
        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {products.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700/50"
            >
              {/* Image */}
              <div className="aspect-square bg-slate-700/50 flex items-center justify-center relative">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-12 h-12 text-slate-500" />
                )}
                
                {product.featured && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500/90 rounded-full text-xs font-bold text-black">
                    ⭐ Destacado
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="p-3">
                <h4 className="text-white font-medium text-sm truncate">{product.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-green-400 font-bold">${product.price}</span>
                  {product.originalPrice && (
                    <span className="text-slate-500 line-through text-sm">${product.originalPrice}</span>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setShowProductModal(true);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs hover:bg-slate-600 transition"
                  >
                    <Edit3 className="w-3 h-3 inline mr-1" />
                    Editar
                  </button>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    className="py-1.5 px-3 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Add Product Card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingProduct(null);
              setShowProductModal(true);
            }}
            className="aspect-square bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center gap-3 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition"
          >
            <div className="w-14 h-14 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Plus className="w-7 h-7 text-cyan-400" />
            </div>
            <span className="text-cyan-300 font-medium text-sm">Agregar Producto</span>
          </motion.button>
        </div>
        
        {/* Info */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 mb-8">
          <p className="text-slate-400 text-sm text-center">
            💡 Los productos aparecerán en tu tienda en línea. Los clientes podrán contactarte para comprar.
          </p>
        </div>
        
        {/* Continue Button */}
        <div>
          <button
            onClick={() => setStep('preview')}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3"
          >
            <Eye className="w-5 h-5" />
            Ver Preview
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Product Modal */}
      <ProductModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(null);
        }}
        onSave={saveProduct}
        product={editingProduct}
      />
    </motion.div>
  );
  
  // Preview
  const renderPreview = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-950 pt-16 overflow-hidden"
    >
      {/* Main Content Area with Side Panel */}
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Side Panel - Configuration */}
        <AnimatePresence>
          {showConfigPanel && (
            <>
              {/* Overlay para móviles - cubre toda la pantalla */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-40 md:hidden"
                onClick={() => setShowConfigPanel(false)}
              />
              <motion.div
                initial={{ x: -288, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -288, opacity: 0 }}
                className="fixed left-0 top-16 bottom-0 w-[85vw] max-w-[320px] md:w-72 bg-slate-900 md:bg-slate-900/95 backdrop-blur-sm border-r border-slate-700/50 z-50 overflow-y-auto shadow-xl"
              >
              {/* Panel Header */}
              <div className="sticky top-0 bg-slate-900 border-b border-slate-700/50 p-4 pb-5 z-10">
                {/* Botón Volver */}
                <button
                  onClick={() => setStep(siteType === 'appointments' ? 'appointments-schedule' : siteType === 'store' ? 'products' : 'content')}
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-4 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al editor
                </button>
                
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Configuración</h3>
                  <button 
                    onClick={() => setShowConfigPanel(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Edit Mode + Device Toggle + Publish */}
                <div className="space-y-3 mb-4">
                  {/* Edit Mode Toggle */}
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className={`w-full px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition ${
                      editMode 
                        ? 'bg-cyan-500 text-white' 
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" />
                    {editMode ? 'Editando' : 'Editar'}
                  </button>
                  
                  {/* Device Toggle */}
                  <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      className={`flex-1 p-2 rounded-md transition flex items-center justify-center gap-2 ${previewMode === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Monitor className="w-4 h-4" />
                      <span className="text-sm">Desktop</span>
                    </button>
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      className={`flex-1 p-2 rounded-md transition flex items-center justify-center gap-2 ${previewMode === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span className="text-sm">Móvil</span>
                    </button>
                  </div>
                </div>
                
                {/* Tabs - Solo mostrar Servicios si NO es página informativa */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfigPanelTab('colors')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                      configPanelTab === 'colors' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Palette className="w-4 h-4" />
                    Colores
                  </button>
                  {siteType !== 'informative' && (
                    <button
                      onClick={() => setConfigPanelTab('services')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                        configPanelTab === 'services' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      Servicios
                    </button>
                  )}
                </div>
              </div>
              
              {/* Panel Content */}
              <div className="p-4 pt-6">
                {configPanelTab === 'colors' && (
                  <div className="space-y-6">
                    {/* Current Colors */}
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-3">Tu Paleta de Colores</h4>
                      <div className="space-y-3">
                        {(['Color Principal', 'Color Secundario', 'Color Acento'] as const).map((label, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="relative">
                              <input
                                type="color"
                                value={brandColors[i]}
                                onChange={(e) => {
                                  const newColors = [...brandColors] as [string, string, string];
                                  newColors[i] = e.target.value;
                                  setBrandColors(newColors);
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <div 
                                className="w-10 h-10 rounded-lg border-2 border-white/20 cursor-pointer hover:scale-105 transition"
                                style={{ backgroundColor: brandColors[i] }}
                              />
                            </div>
                            <div className="flex-1">
                              <span className="text-xs text-slate-400 block">{label}</span>
                              <span className="text-sm text-white font-mono">{brandColors[i]}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Preview */}
                    <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
                      <p className="text-xs text-slate-500 mb-2">Vista previa:</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div 
                          className="px-3 py-1.5 rounded-lg font-medium text-white text-xs"
                          style={{ backgroundColor: brandColors[0] }}
                        >
                          Botón
                        </div>
                        <div 
                          className="px-3 py-1.5 rounded-lg font-medium text-white text-xs"
                          style={{ backgroundColor: brandColors[1] }}
                        >
                          Secundario
                        </div>
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: brandColors[2] }}
                        >
                          <Star className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Predefined Palettes */}
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-3">Paletas Sugeridas</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { colors: ['#EC4899', '#8B5CF6', '#F97316'], name: 'Vibrante' },
                          { colors: ['#10B981', '#3B82F6', '#F59E0B'], name: 'Fresco' },
                          { colors: ['#EF4444', '#F97316', '#FBBF24'], name: 'Cálido' },
                          { colors: ['#06B6D4', '#8B5CF6', '#EC4899'], name: 'Tech' },
                          { colors: ['#1F2937', '#6B7280', '#D1D5DB'], name: 'Neutro' },
                          { colors: ['#854d0e', '#a16207', '#16a34a'], name: 'Natural' },
                        ].map((palette, i) => (
                          <button
                            key={i}
                            onClick={() => setBrandColors(palette.colors as [string, string, string])}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition border border-transparent hover:border-cyan-500/50"
                          >
                            <div className="flex rounded overflow-hidden mb-1.5">
                              {palette.colors.map((color, j) => (
                                <div key={j} className="w-full h-6" style={{ backgroundColor: color }} />
                              ))}
                            </div>
                            <span className="text-xs text-slate-400">{palette.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {configPanelTab === 'services' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-white">Servicios de Citas</h4>
                      <button
                        onClick={() => {
                          setEditingService(null);
                          setShowServiceModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-cyan-500 text-white hover:bg-purple-600 transition"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {appointmentsConfig.services.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm mb-3">No hay servicios configurados</p>
                        <button
                          onClick={() => {
                            setEditingService(null);
                            setShowServiceModal(true);
                          }}
                          className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-purple-600 transition"
                        >
                          Agregar Servicio
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {appointmentsConfig.services.map((service) => (
                          <div 
                            key={service.id}
                            className="p-3 rounded-lg bg-slate-800 border border-slate-700/50"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: service.color }}
                                />
                                <span className="text-white font-medium text-sm">{service.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingService(service);
                                    setShowServiceModal(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-white"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setAppointmentsConfig(prev => ({
                                      ...prev,
                                      services: prev.services.filter(s => s.id !== service.id)
                                    }));
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Timer className="w-3 h-3" />
                                {service.duration} min
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {service.price === 0 ? 'Cotizar' : `$${service.price}`}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                service.active 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-slate-600 text-slate-400'
                              }`}>
                                {service.active ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
            </>
          )}
        </AnimatePresence>
        
        {/* Toggle Panel Button - Flotante grande cuando el panel está cerrado */}
        {!showConfigPanel && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => {
              setShowConfigPanel(true);
              setEditMode(true);
            }}
            className="fixed bottom-8 right-8 z-50 p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600 transition-all shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-110 group"
            title="Abrir configuración"
          >
            <Palette className="w-7 h-7 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-cyan-400 rounded-full animate-ping" />
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-cyan-400 rounded-full" />
          </motion.button>
        )}
        
        {/* Preview Frame */}
        <div className={`flex-1 flex justify-center px-2 sm:px-4 pt-4 pb-8 transition-all duration-300 overflow-y-auto overflow-x-hidden ${
          showConfigPanel ? 'md:ml-72' : ''
        }`}>
          {/* Botón Publicar flotante */}
          <button
            onClick={publishSite}
            disabled={isLoading}
            className="fixed top-20 right-2 sm:right-6 z-50 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl flex items-center gap-2 hover:from-blue-700 hover:to-cyan-600 transition disabled:opacity-50 shadow-lg shadow-blue-500/30 text-sm sm:text-base"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Rocket className="w-4 h-4" />
            )}
            Publicar
          </button>
          
          <div
            className={`bg-white rounded-2xl shadow-2xl transition-all duration-300 flex-shrink-0 overflow-y-auto overflow-x-hidden ${
              previewMode === 'mobile' 
                ? 'w-full max-w-[375px] h-[calc(100vh-8rem)]' 
                : 'w-full max-w-5xl h-[calc(100vh-8rem)]'
            }`}
            style={previewMode === 'mobile' ? { minHeight: '667px' } : undefined}
          >
            {selectedTemplate && webContent && (
              <WebsitePreview
                template={selectedTemplate}
                content={webContent}
                business={businessInfo}
                products={products}
                appointmentServices={appointmentsConfig.services}
                siteType={siteType}
                editMode={editMode}
                onContentChange={(field, value) => {
                  setWebContent(prev => {
                    if (!prev) return null;
                    // Si es services, parsear el JSON
                    if (field === 'services') {
                      try {
                        const parsedServices = JSON.parse(value);
                        return { ...prev, services: parsedServices };
                      } catch {
                        return prev;
                      }
                    }
                    return { ...prev, [field]: value };
                  });
                }}
                onHeroImageChange={(url) => setHeroImage(url)}
                heroImage={heroImage}
                brandColors={brandColors}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Tip de edición */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-lg flex items-center gap-2 sm:gap-3 max-w-[calc(100%-2rem)] sm:max-w-none"
          >
            <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="font-medium text-sm sm:text-base">
              <span className="hidden sm:inline">Haz clic en cualquier texto o imagen para editarlo</span>
              <span className="sm:hidden">Toca texto o imagen para editar</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
  
  // Published
  const renderPublished = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950/20 to-slate-950 flex items-center justify-center p-4 pt-20"
    >
      <div className="max-w-lg w-full text-center">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"
        >
          <Check className="w-12 h-12 text-white" />
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-white mb-3"
        >
          ¡Tu Sitio está en Línea! 🎉
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-slate-400 mb-8"
        >
          Tu página web profesional ya está disponible para el mundo
        </motion.p>
        
        {/* URL Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 mb-8"
        >
          <p className="text-slate-400 text-sm mb-3">Tu URL:</p>
          <div className="flex items-center gap-3 bg-slate-900 rounded-xl p-4">
            <Globe className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <span className="text-white font-medium text-lg truncate">{publishedUrl}</span>
            <button
              onClick={() => navigator.clipboard.writeText(`https://${publishedUrl}`)}
              className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition flex-shrink-0"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
        
        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <button
            onClick={() => {
              // Extraer el slug de la URL publicada
              const slug = localStorage.getItem('quantum_published_slug') || publishedUrl.split('/').pop();
              window.open(`/site/${slug}`, '_blank');
            }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-lg flex items-center justify-center gap-3"
          >
            <ExternalLink className="w-5 h-5" />
            Ver mi Sitio
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              className="py-3 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-800 transition flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Compartir
            </button>
            <button
              className="py-3 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-800 transition flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Código QR
            </button>
          </div>
          
          <button
            onClick={() => router.push('/dashboard/mi-negocio?view=optimizador')}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-lg flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-blue-500/25 transition-all"
          >
            <Briefcase className="w-5 h-5" />
            Ir a Mi Negocio
          </button>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 rounded-xl text-slate-400 hover:text-white transition"
          >
            Volver al Dashboard
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
  
  // Main Render
  if (isLoadingEdit && step === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950/20 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden bg-black">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/quantum-logo.mp4" type="video/mp4" />
            </video>
          </div>
          <p className="text-cyan-300">Cargando tu sitio web...</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {step === 'intro' && renderIntro()}
      {step === 'site-type' && renderSiteTypeSelection()}
      {step === 'template' && renderTemplateSelection()}
      {step === 'appointments-services' && renderAppointmentsServices()}
      {step === 'appointments-schedule' && renderAppointmentsSchedule()}
      {step === 'info' && renderBusinessInfo()}
      {step === 'content' && renderContentEditor()}
      {step === 'products' && renderProducts()}
      {step === 'preview' && renderPreview()}
      {step === 'published' && renderPublished()}
      
      {/* ========== MODAL DE MAPA ========== */}
      <AnimatePresence>
        {showMapModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowMapModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-700/50 bg-gradient-to-r from-blue-900/30 to-cyan-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Seleccionar Ubicación</h3>
                      <p className="text-sm text-slate-400">Busca una dirección o usa tu ubicación</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMapModal(false)}
                    className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Buscador */}
              <div className="p-5 border-b border-slate-700/50">
                <div className="relative">
                  <input
                    type="text"
                    value={mapSearchQuery}
                    onChange={(e) => {
                      setMapSearchQuery(e.target.value);
                      searchAddress(e.target.value);
                    }}
                    placeholder="Buscar dirección..."
                    className="w-full p-4 pl-12 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500"
                  />
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  {searchingAddress && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 animate-spin" />
                  )}
                </div>
                
                {/* Sugerencias */}
                {addressSuggestions.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {addressSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setBusinessInfo(prev => ({ ...prev, address: suggestion.display_name }));
                          setAddressLat(parseFloat(suggestion.lat));
                          setAddressLon(parseFloat(suggestion.lon));
                          setAddressSuggestions([]);
                          setMapSearchQuery('');
                        }}
                        className="w-full p-3 text-left rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/30 text-slate-300 text-sm transition"
                      >
                        <MapPin className="w-4 h-4 inline mr-2 text-emerald-400" />
                        {suggestion.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Vista del mapa */}
              <div className="p-5">
                <div className="relative h-64 rounded-xl overflow-hidden bg-slate-800">
                  {addressLat && addressLon ? (
                    <>
                      <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${addressLon - 0.01},${addressLat - 0.01},${addressLon + 0.01},${addressLat + 0.01}&layer=mapnik&marker=${addressLat},${addressLon}`}
                        className="w-full h-full border-0"
                        style={{ filter: 'invert(90%) hue-rotate(180deg)' }}
                      />
                      <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 backdrop-blur rounded-lg p-3">
                        <p className="text-sm text-white font-medium truncate">{businessInfo.address}</p>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                      <Globe className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-sm">Busca una dirección arriba</p>
                      <p className="text-xs mt-1">o usa tu ubicación actual</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-700/50 bg-slate-800/30">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      getCurrentLocation();
                      setTimeout(() => setShowMapModal(false), 1500);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl border border-blue-500/50 text-blue-400 font-medium hover:bg-blue-500/10 transition-all flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Usar Mi Ubicación
                  </button>
                  <button
                    onClick={() => setShowMapModal(false)}
                    disabled={!addressLat || !addressLon}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== MODAL DE HORARIOS ========== */}
      <AnimatePresence>
        {showHorarioModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowHorarioModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-700/50 bg-gradient-to-r from-blue-900/30 to-cyan-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Configurar Horario</h3>
                      <p className="text-sm text-slate-400">Define tus días y horas de atención</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHorarioModal(false)}
                    className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Contenido - Lista de días */}
              <div className="p-5 max-h-[60vh] overflow-y-auto">
                <div className="space-y-3">
                  {Object.entries(horarioConfig).map(([dia, config]) => (
                    <div 
                      key={dia} 
                      className={`p-4 rounded-xl border transition-all ${
                        config.abierto 
                          ? 'bg-emerald-500/10 border-emerald-500/30' 
                          : 'bg-slate-800/50 border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="capitalize text-white font-medium text-lg">{dia}</span>
                        <button
                          onClick={() => setHorarioConfig(prev => ({
                            ...prev,
                            [dia]: { ...prev[dia], abierto: !prev[dia].abierto }
                          }))}
                          className={`relative w-14 h-7 rounded-full transition-all ${
                            config.abierto ? 'bg-emerald-500' : 'bg-slate-600'
                          }`}
                        >
                          <motion.div
                            animate={{ x: config.abierto ? 28 : 4 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
                          />
                        </button>
                      </div>
                      
                      {config.abierto && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="flex items-center gap-3"
                        >
                          <div className="flex-1">
                            <label className="block text-xs text-slate-400 mb-1">Desde</label>
                            <input
                              type="time"
                              value={config.desde}
                              onChange={(e) => setHorarioConfig(prev => ({
                                ...prev,
                                [dia]: { ...prev[dia], desde: e.target.value }
                              }))}
                              className="w-full p-2 rounded-lg bg-slate-800 border border-slate-600/50 text-white text-center"
                            />
                          </div>
                          <span className="text-slate-500 pt-5">→</span>
                          <div className="flex-1">
                            <label className="block text-xs text-slate-400 mb-1">Hasta</label>
                            <input
                              type="time"
                              value={config.hasta}
                              onChange={(e) => setHorarioConfig(prev => ({
                                ...prev,
                                [dia]: { ...prev[dia], hasta: e.target.value }
                              }))}
                              className="w-full p-2 rounded-lg bg-slate-800 border border-slate-600/50 text-white text-center"
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Aplicar a todos */}
                <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <p className="text-sm text-slate-400 mb-3">⚡ Aplicar mismo horario a todos los días abiertos:</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      defaultValue="09:00"
                      id="qw-horario-desde-all"
                      className="flex-1 p-2 rounded-lg bg-slate-700 border border-slate-600/50 text-white text-center"
                    />
                    <span className="text-slate-500">→</span>
                    <input
                      type="time"
                      defaultValue="18:00"
                      id="qw-horario-hasta-all"
                      className="flex-1 p-2 rounded-lg bg-slate-700 border border-slate-600/50 text-white text-center"
                    />
                    <button
                      onClick={() => {
                        const desde = (document.getElementById('qw-horario-desde-all') as HTMLInputElement)?.value || '09:00';
                        const hasta = (document.getElementById('qw-horario-hasta-all') as HTMLInputElement)?.value || '18:00';
                        setHorarioConfig(prev => {
                          const updated = { ...prev };
                          Object.keys(updated).forEach(dia => {
                            if (updated[dia].abierto) {
                              updated[dia] = { ...updated[dia], desde, hasta };
                            }
                          });
                          return updated;
                        });
                      }}
                      className="px-4 py-2 rounded-lg bg-blue-600/20 border border-cyan-500/30 text-cyan-400 hover:bg-blue-600/30 transition text-sm font-medium"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-700/50 bg-slate-800/30">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowHorarioModal(false)}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-700/50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      // El useEffect ya sincroniza automáticamente horarioConfig con businessInfo.schedule
                      setShowHorarioModal(false);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Guardar Horario
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== MODAL DE ERROR ========== */}
      <AnimatePresence>
        {showError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowError(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-blue-500/30 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header con ícono */}
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-blue-400" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">
                  ¡Oops! Algo salió mal
                </h3>
                
                <p className="text-slate-400 text-sm">
                  {errorMessage}
                </p>
              </div>

              {/* Footer con botón */}
              <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
                <button
                  onClick={() => setShowError(false)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Entendido
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ========== COMPONENTES AUXILIARES ==========

// Modal de Producto
function ProductModal({
  isOpen,
  onClose,
  onSave,
  product
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  product: Product | null;
}) {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    originalPrice: undefined,
    image: '',
    category: '',
    inStock: true,
    featured: false
  });
  
  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        originalPrice: undefined,
        image: '',
        category: '',
        inStock: true,
        featured: false
      });
    }
  }, [product, isOpen]);
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, image: data.url }));
      }
    } catch (error) {
      console.error('Error uploading:', error);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Image */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Imagen</label>
            <div className="flex gap-3">
              <div className="w-24 h-24 rounded-xl bg-slate-700 flex items-center justify-center overflow-hidden">
                {formData.image ? (
                  <img src={formData.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-8 h-8 text-slate-500" />
                )}
              </div>
              <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-cyan-500/50 transition">
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs text-slate-400">Subir imagen</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>
          
          {/* Name */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Nombre *</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Café Americano"
              className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white"
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Descripción</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe tu producto"
              rows={2}
              className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white resize-none"
            />
          </div>
          
          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Precio *</label>
              <input
                type="number"
                value={formData.price === 0 ? '' : formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value === '' ? 0 : parseFloat(e.target.value) }))}
                placeholder="0.00"
                className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Precio Original</label>
              <input
                type="number"
                value={formData.originalPrice === 0 ? '' : (formData.originalPrice || '')}
                onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                placeholder="Opcional"
                className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white"
              />
            </div>
          </div>
          
          {/* Toggles */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.inStock}
                onChange={(e) => setFormData(prev => ({ ...prev, inStock: e.target.checked }))}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-sm text-slate-300">En stock</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-sm text-slate-300">Destacado</span>
            </label>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (formData.name && formData.price) {
                onSave(formData as Product);
              }
            }}
            disabled={!formData.name || !formData.price}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Preview del Website
// Imágenes de fondo por categoría para preview
const PREVIEW_HERO_IMAGES: Record<string, string> = {
  restaurante: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80',
  tienda: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&q=80',
  servicios: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80',
  salud: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1920&q=80',
  belleza: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80',
  educacion: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1920&q=80',
  tecnologia: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=80',
  fitness: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80',
  arte: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1920&q=80',
  otro: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1920&q=80'
};

// Componente de texto editable inline
function EditableText({
  value,
  onChange,
  editMode,
  className = '',
  style = {},
  multiline = false,
  placeholder = 'Escribe aquí...'
}: {
  value: string;
  onChange: (value: string) => void;
  editMode: boolean;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  useEffect(() => {
    setTempValue(value);
  }, [value]);
  
  if (!editMode) {
    return <span className={className} style={style}>{value}</span>;
  }
  
  if (isEditing) {
    const commonProps = {
      ref: inputRef as any,
      value: tempValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setTempValue(e.target.value),
      onBlur: () => {
        onChange(tempValue);
        setIsEditing(false);
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) {
          onChange(tempValue);
          setIsEditing(false);
        }
        if (e.key === 'Escape') {
          setTempValue(value);
          setIsEditing(false);
        }
      },
      className: `${className} bg-transparent border-2 border-orange-400 rounded px-2 py-1 outline-none`,
      style: { ...style, minWidth: '100px' },
      placeholder
    };
    
    return multiline ? (
      <textarea {...commonProps} rows={3} />
    ) : (
      <input type="text" {...commonProps} />
    );
  }
  
  return (
    <span 
      className={`${className} cursor-pointer relative group`}
      style={style}
      onClick={() => setIsEditing(true)}
    >
      {value || placeholder}
      <span className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Edit3 className="w-3 h-3" />
      </span>
    </span>
  );
}

function WebsitePreview({
  template,
  content,
  business,
  products,
  appointmentServices = [],
  siteType = 'informative',
  editMode = false,
  onContentChange,
  onHeroImageChange,
  heroImage: externalHeroImage,
  brandColors
}: {
  template: QuantumTemplate;
  content: WebContent;
  business: BusinessInfo;
  products: Product[];
  appointmentServices?: AppointmentService[];
  siteType?: 'store' | 'informative' | 'appointments' | null;
  editMode?: boolean;
  onContentChange?: (field: string, value: string) => void;
  onHeroImageChange?: (url: string) => void;
  heroImage?: string;
  brandColors?: [string, string, string];
}) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para modal de agendamiento
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<AppointmentService | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [bookingStep, setBookingStep] = useState<'select' | 'contact'>('select');
  
  // Estado para modal de detalle de producto
  const [showProductDetailModal, setShowProductDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Usar brandColors personalizados si existen, sino los del template
  const colors = brandColors ? {
    ...template.colors,
    primary: brandColors[0],
    secondary: brandColors[1],
    accent: brandColors[2]
  } : template.colors;
  const isDarkTheme = template.style === 'energetic' || template.style === 'tech';
  const heroImage = externalHeroImage || (content as any).heroImage || PREVIEW_HERO_IMAGES[business.category || 'otro'] || PREVIEW_HERO_IMAGES.otro;
  
  // Estilos específicos por template
  const templateStyles = {
    // MINIMALISTA - Espacios amplios, bordes finos, sin sombras pesadas
    minimal: {
      heroHeight: 'min-h-[60vh]',
      heroOverlay: `linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.7) 100%)`,
      cardStyle: 'border border-gray-200 bg-white',
      cardRadius: 'rounded-none',
      buttonStyle: 'rounded-none border-2',
      sectionPadding: 'py-24 md:py-36',
      titleStyle: 'tracking-tight font-light',
      pattern: 'none',
      decorations: false,
    },
    // HIGH ENERGY - Gradientes fuertes, formas angulares, animaciones
    energetic: {
      heroHeight: 'min-h-[80vh]',
      heroOverlay: `linear-gradient(135deg, ${colors.primary}f5 0%, ${colors.secondary}e5 50%, ${colors.accent}d0 100%)`,
      cardStyle: 'bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg border border-white/20',
      cardRadius: 'rounded-3xl',
      buttonStyle: 'rounded-full shadow-lg shadow-current/30',
      sectionPadding: 'py-16 md:py-24',
      titleStyle: 'uppercase tracking-wider font-black',
      pattern: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      decorations: true,
    },
    // ARTESANAL - Texturas, bordes suaves, sensación orgánica
    artisan: {
      heroHeight: 'min-h-[55vh]',
      heroOverlay: `linear-gradient(180deg, rgba(139,69,19,0.3) 0%, rgba(0,0,0,0.75) 100%)`,
      cardStyle: 'bg-amber-50/80 border border-amber-200/50 shadow-sm',
      cardRadius: 'rounded-2xl',
      buttonStyle: 'rounded-xl',
      sectionPadding: 'py-16 md:py-24',
      titleStyle: 'font-serif italic',
      pattern: `url("data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d97706' fill-opacity='0.08'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      decorations: false,
    },
    // TECH FUTURISTA - Glassmorphism, neón, líneas tech
    tech: {
      heroHeight: 'min-h-[75vh]',
      heroOverlay: `linear-gradient(135deg, ${colors.primary}f0 0%, rgba(0,0,0,0.9) 50%, ${colors.secondary}80 100%)`,
      cardStyle: 'bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 shadow-lg shadow-cyan-500/10',
      cardRadius: 'rounded-2xl',
      buttonStyle: 'rounded-lg border border-cyan-400/50',
      sectionPadding: 'py-20 md:py-32',
      titleStyle: 'font-mono tracking-wide',
      pattern: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%2306b6d4' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`,
      decorations: true,
    },
    // CORPORATIVO - Estructura sólida, líneas rectas, profesional
    corporate: {
      heroHeight: 'min-h-[65vh]',
      heroOverlay: `linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.75) 100%)`,
      cardStyle: 'bg-white shadow-md border-l-4',
      cardRadius: 'rounded-lg',
      buttonStyle: 'rounded-md',
      sectionPadding: 'py-16 md:py-24',
      titleStyle: 'font-semibold',
      pattern: 'none',
      decorations: false,
    },
  };
  
  const styles = templateStyles[template.style as keyof typeof templateStyles] || templateStyles.corporate;
  
  // Función para subir imagen
  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onHeroImageChange) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        onHeroImageChange(data.url);
        setShowImageModal(false);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Imágenes predefinidas por categoría
  const predefinedImages = [
    { url: PREVIEW_HERO_IMAGES[business.category || 'otro'], label: 'Recomendada' },
    { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80', label: 'Oficina' },
    { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80', label: 'Restaurante' },
    { url: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&q=80', label: 'Tienda' },
    { url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80', label: 'Belleza' },
    { url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80', label: 'Fitness' },
    { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=80', label: 'Tecnología' },
    { url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1920&q=80', label: 'Salud' },
  ];
  
  const handleContentChange = (field: string, value: string) => {
    if (onContentChange) {
      onContentChange(field, value);
    }
  };
  
  return (
    <div style={{ backgroundColor: colors.background, color: colors.text, fontFamily: template.fonts.body }}>
      {/* Modal selector de imagen */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setShowImageModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto"
            >
              <h3 className="text-xl font-bold text-white mb-4">Cambiar imagen de fondo</h3>
              
              {/* Subir imagen */}
              <div className="mb-6">
                <label className="text-sm text-slate-400 mb-2 block">Sube tu propia imagen</label>
                <label 
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-cyan-500 transition bg-slate-800/50 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleHeroImageUpload} 
                    className="hidden" 
                    ref={fileInputRef}
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <span className="text-sm text-slate-400">Subiendo imagen...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-sm text-slate-400">Haz clic para seleccionar una imagen</span>
                      <span className="text-xs text-slate-500 mt-1">JPG, PNG, WebP (máx. 5MB)</span>
                    </div>
                  )}
                </label>
              </div>
              
              {/* Separador */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-sm text-slate-500">o</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
              
              {/* URL personalizada */}
              <div className="mb-6">
                <label className="text-sm text-slate-400 mb-2 block">Pega una URL de imagen</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                  />
                  <button
                    onClick={() => {
                      if (customImageUrl && onHeroImageChange) {
                        onHeroImageChange(customImageUrl);
                        setShowImageModal(false);
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
              
              {/* Imágenes predefinidas */}
              <label className="text-sm text-slate-400 mb-2 block">O elige una imagen predefinida</label>
              <div className="grid grid-cols-4 gap-3">
                {predefinedImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (onHeroImageChange) {
                        onHeroImageChange(img.url);
                        setShowImageModal(false);
                      }
                    }}
                    className={`relative aspect-video rounded-lg overflow-hidden border-2 transition ${
                      heroImage === img.url ? 'border-cyan-500' : 'border-transparent hover:border-slate-600'
                    }`}
                  >
                    <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 text-center">
                      {img.label}
                    </span>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setShowImageModal(false)}
                className="mt-6 w-full py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ============ HERO SECTION - DIFERENCIADO POR TEMPLATE ============ */}
      <section className={`relative ${styles.heroHeight} flex items-center justify-center overflow-hidden`}>
        {/* Background Image - con botón de editar */}
        <div className="absolute inset-0 group">
          <img 
            src={heroImage}
            alt="Hero background"
            className={`w-full h-full object-cover ${template.style === 'energetic' ? 'scale-110' : 'scale-105'}`}
          />
          {/* Overlay según template */}
          <div 
            className="absolute inset-0"
            style={{ background: styles.heroOverlay }}
          />
          {/* Patrón decorativo según template */}
          {styles.pattern !== 'none' && (
            <div className="absolute inset-0 opacity-100" style={{ backgroundImage: styles.pattern }} />
          )}
          {/* Decoraciones específicas */}
          {styles.decorations && template.style === 'energetic' && (
            <>
              <div className="absolute top-20 left-10 w-32 h-32 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: colors.accent, opacity: 0.3 }} />
              <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: colors.secondary, opacity: 0.2, animationDelay: '1s' }} />
            </>
          )}
          {styles.decorations && template.style === 'tech' && (
            <>
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
              <div className="absolute top-1/4 right-20 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <div className="absolute bottom-1/3 left-20 w-2 h-2 rounded-full bg-purple-400 animate-ping" style={{ animationDelay: '0.5s' }} />
            </>
          )}
          {/* Botón editar imagen */}
          {editMode && (
            <button
              onClick={() => setShowImageModal(true)}
              className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-orange-500 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-1 sm:gap-2 opacity-90 hover:opacity-100 transition z-20 text-xs sm:text-sm"
            >
              <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Cambiar </span>imagen
            </button>
          )}
        </div>
        
        {/* Hero Content - Layout diferente por template */}
        <div className={`relative z-10 w-full max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-16 ${
          template.style === 'minimal' ? 'text-left md:pl-12' : 
          template.style === 'artisan' ? 'text-center' : 
          'text-center'
        }`}>
          {/* Logo */}
          {business.logo && (
            <div className={`mb-5 md:mb-8 ${template.style === 'minimal' ? '' : 'flex justify-center'}`}>
              <div className="relative inline-block">
                {template.style !== 'minimal' && (
                  <div className="absolute inset-0 blur-2xl opacity-50" style={{ backgroundColor: colors.accent }} />
                )}
                <img
                  src={business.logo}
                  alt={business.name}
                  className={`relative object-cover shadow-2xl ${
                    template.style === 'minimal' ? 'w-16 h-16 rounded-none' :
                    template.style === 'tech' ? 'w-20 h-20 md:w-24 md:h-24 rounded-xl ring-2 ring-cyan-500/30' :
                    template.style === 'artisan' ? 'w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white/50' :
                    'w-20 h-20 md:w-28 md:h-28 rounded-2xl md:rounded-3xl ring-4 ring-white/30'
                  }`}
                />
              </div>
            </div>
          )}
          
          {/* Badge de negocio - diferente por estilo */}
          {business.category && template.style !== 'minimal' && (
            <span className={`inline-block mb-4 md:mb-6 ${
              template.style === 'energetic' ? 'px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm border border-white/30' :
              template.style === 'tech' ? 'px-4 py-1.5 rounded-lg text-xs font-mono bg-cyan-500/20 border border-cyan-500/30 text-cyan-200' :
              template.style === 'artisan' ? 'px-5 py-2 rounded-full text-sm italic bg-amber-900/30 border border-amber-200/30' :
              'px-4 py-1.5 rounded-full text-xs md:text-sm font-medium backdrop-blur-sm bg-white/15'
            }`} style={{ color: 'rgba(255,255,255,0.95)' }}>
              {template.style === 'tech' ? '// ' : template.style === 'artisan' ? '✦ ' : '✨ '}{business.category}
            </span>
          )}
          
          {/* Título editable - estilo diferente */}
          <div className={`mb-4 md:mb-6 leading-tight ${
            template.style === 'minimal' ? 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl max-w-2xl' :
            template.style === 'energetic' ? 'text-4xl sm:text-5xl md:text-7xl lg:text-8xl' :
            template.style === 'artisan' ? 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl' :
            template.style === 'tech' ? 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl' :
            'text-3xl sm:text-4xl md:text-5xl lg:text-7xl'
          }`}>
            <EditableText
              value={content.heroTitle}
              onChange={(val) => handleContentChange('heroTitle', val)}
              editMode={editMode}
              style={{ 
                fontFamily: template.fonts.heading,
                color: '#fff',
                textShadow: template.style === 'tech' ? '0 0 40px rgba(6,182,212,0.3)' : '0 4px 40px rgba(0,0,0,0.4)',
                ...(template.style === 'minimal' && { fontWeight: 300, letterSpacing: '-0.02em' }),
                ...(template.style === 'energetic' && { fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }),
                ...(template.style === 'artisan' && { fontStyle: 'italic' as const, fontWeight: 400 }),
                ...(template.style === 'tech' && { fontFamily: 'monospace', letterSpacing: '0.1em' }),
              }}
            />
          </div>
          
          {/* Subtítulo editable */}
          <div className={`mb-8 md:mb-10 leading-relaxed ${
            template.style === 'minimal' ? 'text-lg md:text-xl max-w-xl' :
            template.style === 'energetic' ? 'text-lg md:text-2xl max-w-3xl mx-auto font-medium' :
            'text-base sm:text-lg md:text-xl lg:text-2xl max-w-2xl mx-auto'
          }`}>
            <EditableText
              value={content.heroSubtitle}
              onChange={(val) => handleContentChange('heroSubtitle', val)}
              editMode={editMode}
              style={{ 
                color: 'rgba(255,255,255,0.9)', 
                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                ...(template.style === 'tech' && { fontFamily: 'monospace', opacity: 0.8 }),
              }}
              multiline
            />
          </div>
          
          {/* Botones - estilo diferente por template */}
          <div className={`flex gap-4 md:gap-5 ${
            template.style === 'minimal' ? 'flex-col sm:flex-row' : 
            'flex-col sm:flex-row items-center justify-center'
          }`}>
            <button
              className={`group flex items-center gap-3 font-bold transition-all duration-300 hover:scale-105 ${
                template.style === 'minimal' ? 'px-8 py-4 rounded-none border-2 border-white text-white hover:bg-white hover:text-black' :
                template.style === 'energetic' ? 'px-10 py-5 rounded-full text-lg uppercase tracking-wider shadow-2xl' :
                template.style === 'tech' ? 'px-8 py-4 rounded-lg border border-cyan-400/50 bg-cyan-500/20 backdrop-blur-sm text-white hover:bg-cyan-500/40' :
                template.style === 'artisan' ? 'px-8 py-4 rounded-xl shadow-lg' :
                'px-8 py-4 md:px-10 md:py-5 rounded-full text-base md:text-lg shadow-2xl'
              } w-full sm:w-auto justify-center`}
              style={{ 
                backgroundColor: template.style === 'minimal' ? 'transparent' : template.style === 'tech' ? 'rgba(6,182,212,0.2)' : colors.accent, 
                color: '#fff',
                boxShadow: template.style === 'energetic' ? `0 15px 50px ${colors.accent}60` : template.style === 'tech' ? `0 0 30px ${colors.accent}30` : `0 10px 40px ${colors.accent}50`
              }}
            >
              <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
              <EditableText
                value={content.ctaText}
                onChange={(val) => handleContentChange('ctaText', val)}
                editMode={editMode}
              />
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:translate-x-1" />
            </button>
            
            {business.phone && (
              <button className={`flex items-center gap-2 font-semibold transition-all ${
                template.style === 'minimal' ? 'px-6 py-3 border border-white/50 text-white hover:bg-white/10' :
                template.style === 'energetic' ? 'px-8 py-4 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/40 text-white' :
                template.style === 'tech' ? 'px-6 py-3 rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm text-white' :
                'px-6 py-3 md:px-7 md:py-4 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/30 hover:bg-white/25'
              }`}>
                <Phone className="w-4 h-4 md:w-5 md:h-5" />
                Llamar
              </button>
            )}
          </div>
          
          {/* Scroll indicator - solo en algunos templates */}
          {(template.style === 'energetic' || template.style === 'corporate') && (
            <div className="hidden md:flex flex-col items-center mt-12 animate-bounce opacity-60">
              <span className="text-white/70 text-xs mb-2">Descubre más</span>
              <ChevronDown className="w-5 h-5 text-white/70" />
            </div>
          )}
        </div>
      </section>

      {/* ============ ABOUT SECTION ============ */}
      <section className={`px-4 md:px-6 relative overflow-hidden ${
        template.style === 'minimal' ? 'py-20 md:py-32' :
        template.style === 'energetic' ? 'py-12 md:py-20' :
        template.style === 'artisan' ? 'py-16 md:py-24' :
        template.style === 'tech' ? 'py-16 md:py-28' :
        'py-16 md:py-28'
      }`} style={{
        backgroundColor: template.style === 'tech' ? '#0a0a0a' : 
                        template.style === 'artisan' ? '#faf8f5' :
                        template.style === 'minimal' ? '#fff' : 'transparent'
      }}>
        {/* Elementos decorativos según template */}
        {template.style === 'energetic' && (
          <>
            <div className="absolute top-0 left-0 w-full h-2" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})` }} />
            <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-30" style={{ backgroundColor: colors.accent, filter: 'blur(60px)' }} />
            <div className="absolute -right-20 top-1/3 w-60 h-60 rounded-full opacity-20" style={{ backgroundColor: colors.primary, filter: 'blur(80px)' }} />
          </>
        )}
        {template.style === 'tech' && (
          <>
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(${colors.primary} 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
            <div className="absolute top-10 right-10 w-32 h-32 border opacity-20" style={{ borderColor: colors.primary, transform: 'rotate(45deg)' }} />
            <div className="absolute bottom-10 left-10 w-24 h-24 border opacity-20" style={{ borderColor: colors.accent, transform: 'rotate(12deg)' }} />
          </>
        )}
        {template.style === 'artisan' && (
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M30 0L60 30L30 60L0 30z" fill="none" stroke="%23000" stroke-width="0.5"/%3E%3C/svg%3E")' }} />
        )}
        {template.style === 'corporate' && (
          <>
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5" style={{ backgroundColor: colors.primary, filter: 'blur(100px)' }} />
            <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-5" style={{ backgroundColor: colors.accent, filter: 'blur(80px)' }} />
          </>
        )}
        
        <div className={`mx-auto ${template.style === 'minimal' ? 'max-w-4xl' : 'max-w-5xl'}`}>
          {/* Layout según template style */}
          {template.style === 'minimal' ? (
            /* MINIMAL: Diseño centrado, tipografía elegante, sin visual lateral */
            <div className="text-center">
              <div className="mb-12">
                <div className="w-16 h-[2px] mx-auto mb-8" style={{ backgroundColor: colors.primary }} />
                <div 
                  className="text-4xl md:text-6xl font-light mb-8 tracking-tight"
                  style={{ fontFamily: 'Georgia, serif', color: colors.primary }}
                >
                  <EditableText
                    value={content.aboutTitle}
                    onChange={(val) => handleContentChange('aboutTitle', val)}
                    editMode={editMode}
                  />
                </div>
                <div className="text-lg md:text-xl leading-relaxed max-w-2xl mx-auto" style={{ color: colors.secondary }}>
                  <EditableText
                    value={content.aboutText}
                    onChange={(val) => handleContentChange('aboutText', val)}
                    editMode={editMode}
                    multiline
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-8 sm:gap-16 pt-8 border-t" style={{ borderColor: colors.primary + '20' }}>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-light" style={{ color: colors.primary }}>
                    <EditableText value={content.stat1Value || '5+'} onChange={(val) => handleContentChange('stat1Value', val)} editMode={editMode} />
                  </div>
                  <div className="text-sm uppercase tracking-widest mt-2" style={{ color: colors.secondary }}>
                    <EditableText value={content.stat1Label || 'Años de experiencia'} onChange={(val) => handleContentChange('stat1Label', val)} editMode={editMode} />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-light" style={{ color: colors.primary }}>
                    <EditableText value={content.stat2Value || '100%'} onChange={(val) => handleContentChange('stat2Value', val)} editMode={editMode} />
                  </div>
                  <div className="text-sm uppercase tracking-widest mt-2" style={{ color: colors.secondary }}>
                    <EditableText value={content.stat2Label || 'Compromiso'} onChange={(val) => handleContentChange('stat2Label', val)} editMode={editMode} />
                  </div>
                </div>
              </div>
            </div>
          ) : template.style === 'energetic' ? (
            /* ENERGETIC: Diseño diagonal, colores vibrantes, animado */
            <div className="relative">
              <div className="absolute -top-4 -left-4 text-6xl md:text-8xl font-black opacity-10" style={{ color: colors.primary }}>ABOUT</div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5">
                  <div className="relative p-1 rounded-2xl" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                    <div className="bg-white rounded-xl p-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.primary + '10' }}>
                          <div className="text-3xl md:text-4xl font-black" style={{ color: colors.primary }}>
                            <EditableText value={content.stat1Value || '5+'} onChange={(val) => handleContentChange('stat1Value', val)} editMode={editMode} />
                          </div>
                          <div className="text-xs uppercase font-bold mt-1" style={{ color: colors.accent }}>
                            <EditableText value={content.stat1Label || 'Años de experiencia'} onChange={(val) => handleContentChange('stat1Label', val)} editMode={editMode} />
                          </div>
                        </div>
                        <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.accent + '10' }}>
                          <div className="text-3xl md:text-4xl font-black" style={{ color: colors.accent }}>
                            <EditableText value={content.stat2Value || '100%'} onChange={(val) => handleContentChange('stat2Value', val)} editMode={editMode} />
                          </div>
                          <div className="text-xs uppercase font-bold mt-1" style={{ color: colors.primary }}>
                            <EditableText value={content.stat2Label || 'Compromiso'} onChange={(val) => handleContentChange('stat2Label', val)} editMode={editMode} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-7">
                  <div className="uppercase text-sm font-bold tracking-widest mb-4" style={{ color: colors.accent }}>¿Quiénes somos?</div>
                  <div className="text-3xl md:text-4xl font-black mb-4 uppercase" style={{ color: colors.primary }}>
                    <EditableText value={content.aboutTitle} onChange={(val) => handleContentChange('aboutTitle', val)} editMode={editMode} />
                  </div>
                  <div className="text-base leading-relaxed" style={{ color: colors.secondary }}>
                    <EditableText value={content.aboutText} onChange={(val) => handleContentChange('aboutText', val)} editMode={editMode} multiline />
                  </div>
                  <div className="flex flex-wrap gap-3 mt-6">
                    {['Calidad', 'Compromiso', 'Resultados'].map((item, idx) => (
                      <span key={idx} className="px-4 py-2 rounded-full text-sm font-bold uppercase" style={{ backgroundColor: idx === 1 ? colors.accent : colors.primary, color: 'white' }}>{item}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : template.style === 'artisan' ? (
            /* ARTISAN: Diseño orgánico, formas naturales, tipografía clásica */
            <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-5 md:gap-12 md:items-center">
              {/* Texto - siempre primero en móvil */}
              <div className="md:col-span-3 md:order-2">
                <div className="flex items-center gap-3 mb-3 md:mb-6">
                  <div className="w-8 md:w-12 h-[1px]" style={{ backgroundColor: colors.primary }} />
                  <span className="text-xs md:text-sm italic" style={{ color: colors.accent }}>Nuestra Historia</span>
                </div>
                <div className="text-2xl md:text-4xl font-serif mb-3 md:mb-6" style={{ color: colors.primary }}>
                  <EditableText value={content.aboutTitle} onChange={(val) => handleContentChange('aboutTitle', val)} editMode={editMode} />
                </div>
                <div className="text-sm md:text-base leading-relaxed md:leading-loose" style={{ color: colors.secondary, fontFamily: 'Georgia, serif' }}>
                  <EditableText value={content.aboutText} onChange={(val) => handleContentChange('aboutText', val)} editMode={editMode} multiline />
                </div>
                <div className="hidden md:flex items-center gap-4 mt-8 pt-6 border-t" style={{ borderColor: colors.primary + '20' }}>
                  <div className="flex -space-x-3">
                    {[1,2,3].map(i => <div key={i} className="w-10 h-10 rounded-full border-2 border-white" style={{ backgroundColor: i === 1 ? colors.primary : i === 2 ? colors.accent : colors.secondary }} />)}
                  </div>
                  <span className="text-sm italic" style={{ color: colors.secondary }}>Creado con pasión y dedicación</span>
                </div>
              </div>
              {/* Stats - abajo en móvil, horizontal y compacto */}
              <div className="md:col-span-2 md:order-1">
                <div className="bg-white rounded-2xl md:rounded-[40px] p-4 md:p-8 shadow-lg border" style={{ borderColor: colors.primary + '20' }}>
                  <div className="flex items-center gap-4 md:flex-col md:text-center">
                    <div className="w-12 h-12 md:w-20 md:h-20 md:mx-auto md:mb-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${colors.primary}20, ${colors.accent}20)`, border: `2px solid ${colors.primary}` }}>
                      <Award className="w-6 h-6 md:w-10 md:h-10" style={{ color: colors.primary }} />
                    </div>
                    <div className="flex gap-6 md:flex-col md:gap-4 md:w-full">
                      <div className="md:py-3 md:border-b" style={{ borderColor: colors.primary + '20' }}>
                        <div className="text-lg md:text-3xl font-serif font-bold" style={{ color: colors.primary }}>
                          <EditableText value={content.stat1Value || '5+'} onChange={(val) => handleContentChange('stat1Value', val)} editMode={editMode} />
                        </div>
                        <div className="text-[10px] md:text-sm italic" style={{ color: colors.secondary }}>
                          <EditableText value={content.stat1Label || 'Años exp.'} onChange={(val) => handleContentChange('stat1Label', val)} editMode={editMode} />
                        </div>
                      </div>
                      <div className="md:py-3">
                        <div className="text-lg md:text-3xl font-serif font-bold" style={{ color: colors.primary }}>
                          <EditableText value={content.stat2Value || '100%'} onChange={(val) => handleContentChange('stat2Value', val)} editMode={editMode} />
                        </div>
                        <div className="text-[10px] md:text-sm italic" style={{ color: colors.secondary }}>
                          <EditableText value={content.stat2Label || 'Compromiso'} onChange={(val) => handleContentChange('stat2Label', val)} editMode={editMode} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : template.style === 'tech' ? (
            /* TECH: Diseño futurista, glassmorphism, elementos geométricos */
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="relative order-2 md:order-1">
                  <div className="absolute inset-0 rounded-2xl opacity-20" style={{ background: `linear-gradient(135deg, ${colors.primary}, transparent)` }} />
                  <div className="relative backdrop-blur-sm rounded-2xl p-6 md:p-8 border" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: colors.primary + '30' }}>
                    <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                      <div className="w-16 h-16 rounded-xl flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)`, animation: 'shine 3s infinite' }} />
                        <Zap className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: colors.accent }}>// STATS</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-2xl font-mono font-bold" style={{ color: colors.primary }}>
                              <EditableText value={content.stat1Value || '5+'} onChange={(val) => handleContentChange('stat1Value', val)} editMode={editMode} />
                            </div>
                            <div className="text-xs opacity-60 text-white">
                              <EditableText value={content.stat1Label || 'Años de experiencia'} onChange={(val) => handleContentChange('stat1Label', val)} editMode={editMode} />
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl font-mono font-bold" style={{ color: colors.accent }}>
                              <EditableText value={content.stat2Value || '100%'} onChange={(val) => handleContentChange('stat2Value', val)} editMode={editMode} />
                            </div>
                            <div className="text-xs opacity-60 text-white">
                              <EditableText value={content.stat2Label || 'Compromiso'} onChange={(val) => handleContentChange('stat2Label', val)} editMode={editMode} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t" style={{ borderColor: colors.primary + '20' }}>
                      <div className="flex items-center gap-2 text-xs" style={{ color: colors.primary }}>
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors.accent }} />
                        <span className="font-mono">STATUS: ACTIVE</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="order-1 md:order-2">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: colors.primary + '20', color: colors.primary }}>&lt;about&gt;</span>
                  </div>
                  <div className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'white' }}>
                    <EditableText value={content.aboutTitle} onChange={(val) => handleContentChange('aboutTitle', val)} editMode={editMode} />
                  </div>
                  <div className="text-base leading-relaxed opacity-70 text-white">
                    <EditableText value={content.aboutText} onChange={(val) => handleContentChange('aboutText', val)} editMode={editMode} multiline />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-6">
                    {['innovation', 'technology', 'future'].map((tag, idx) => (
                      <span key={idx} className="px-3 py-1 text-xs font-mono rounded border" style={{ borderColor: colors.accent + '50', color: colors.accent }}>#{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* CORPORATE: Diseño profesional, estructura clara, elegante */
            <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
              <div className="relative order-2 md:order-1">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-3xl opacity-20" style={{ background: `linear-gradient(135deg, ${colors.primary}40, ${colors.accent}40)` }} />
                  <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-8 md:p-12">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 md:w-28 md:h-28 rounded-2xl md:rounded-3xl mb-6" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                        <Award className="w-10 h-10 md:w-14 md:h-14 text-white" />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="text-center p-4 rounded-xl bg-white shadow-sm">
                          <div className="text-2xl md:text-3xl font-bold" style={{ color: colors.primary }}>
                            <EditableText value={content.stat1Value || '5+'} onChange={(val) => handleContentChange('stat1Value', val)} editMode={editMode} />
                          </div>
                          <div className="text-xs md:text-sm text-gray-500">
                            <EditableText value={content.stat1Label || 'Años de experiencia'} onChange={(val) => handleContentChange('stat1Label', val)} editMode={editMode} />
                          </div>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-white shadow-sm">
                          <div className="text-2xl md:text-3xl font-bold" style={{ color: colors.primary }}>
                            <EditableText value={content.stat2Value || '100%'} onChange={(val) => handleContentChange('stat2Value', val)} editMode={editMode} />
                          </div>
                          <div className="text-xs md:text-sm text-gray-500">
                            <EditableText value={content.stat2Label || 'Compromiso'} onChange={(val) => handleContentChange('stat2Label', val)} editMode={editMode} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold mb-6" style={{ backgroundColor: colors.accent + '15', color: colors.accent }}>
                  <Sparkles className="w-4 h-4" />
                  Conócenos
                </span>
                <div className="text-3xl md:text-5xl font-bold mb-6 leading-tight" style={{ fontFamily: template.fonts.heading, color: colors.primary }}>
                  <EditableText value={content.aboutTitle} onChange={(val) => handleContentChange('aboutTitle', val)} editMode={editMode} />
                </div>
                <div className="text-base md:text-lg leading-relaxed mb-8" style={{ color: colors.secondary }}>
                  <EditableText value={content.aboutText} onChange={(val) => handleContentChange('aboutText', val)} editMode={editMode} multiline />
                </div>
                <div className="space-y-3">
                  {['Calidad garantizada', 'Atención personalizada', 'Resultados comprobados'].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.accent + '20' }}>
                        <Check className="w-4 h-4" style={{ color: colors.accent }} />
                      </div>
                      <span className="text-sm md:text-base" style={{ color: colors.primary }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      
      {/* ============ SERVICES/FEATURES SECTION ============ */}
      {content.services && content.services.length > 0 && (
        <section className={`px-4 md:px-6 relative overflow-hidden ${
          template.style === 'minimal' ? 'py-20 md:py-32' :
          template.style === 'energetic' ? 'py-12 md:py-20' :
          template.style === 'artisan' ? 'py-16 md:py-24' :
          template.style === 'tech' ? 'py-16 md:py-28' :
          'py-16 md:py-28'
        }`} style={{ 
          backgroundColor: template.style === 'tech' ? '#0a0a0a' : 
                          template.style === 'artisan' ? '#faf8f5' :
                          template.style === 'energetic' ? colors.primary :
                          colors.background 
        }}>
          {/* Patrones de fondo según template */}
          {template.style === 'energetic' && (
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 40px)` }} />
          )}
          {template.style === 'tech' && (
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(${colors.primary} 1px, transparent 1px), linear-gradient(90deg, ${colors.primary} 1px, transparent 1px)`, backgroundSize: '50px 50px' }} />
          )}
          {template.style === 'corporate' && (
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `radial-gradient(${colors.primary} 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
          )}
          
          <div className={`mx-auto relative ${template.style === 'minimal' ? 'max-w-4xl' : 'max-w-6xl'}`}>
            {/* Header según template */}
            {template.style === 'minimal' ? (
              <div className="text-center mb-16">
                <div className="w-16 h-[1px] mx-auto mb-8" style={{ backgroundColor: colors.primary }} />
                <div className="text-3xl md:text-5xl font-light tracking-tight" style={{ fontFamily: 'Georgia, serif', color: colors.primary }}>
                  <EditableText value={content.servicesTitle || '¿Por qué elegirnos?'} onChange={(val) => handleContentChange('servicesTitle', val)} editMode={editMode} />
                </div>
              </div>
            ) : template.style === 'energetic' ? (
              <div className="text-center mb-10">
                <div className="text-3xl md:text-5xl font-black uppercase text-white mb-2">
                  <EditableText value={content.servicesTitle || '¿Por qué elegirnos?'} onChange={(val) => handleContentChange('servicesTitle', val)} editMode={editMode} />
                </div>
                <div className="w-24 h-1 mx-auto rounded-full" style={{ backgroundColor: colors.accent }} />
              </div>
            ) : template.style === 'artisan' ? (
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="w-12 h-[1px]" style={{ backgroundColor: colors.primary }} />
                  <Sparkles className="w-6 h-6" style={{ color: colors.accent }} />
                  <div className="w-12 h-[1px]" style={{ backgroundColor: colors.primary }} />
                </div>
                <div className="text-3xl md:text-4xl font-serif" style={{ color: colors.primary }}>
                  <EditableText value={content.servicesTitle || '¿Por qué elegirnos?'} onChange={(val) => handleContentChange('servicesTitle', val)} editMode={editMode} />
                </div>
              </div>
            ) : template.style === 'tech' ? (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: colors.primary + '20', color: colors.primary }}>&lt;features&gt;</span>
                </div>
                <div className="text-3xl md:text-5xl font-bold text-white">
                  <EditableText value={content.servicesTitle || '¿Por qué elegirnos?'} onChange={(val) => handleContentChange('servicesTitle', val)} editMode={editMode} />
                </div>
              </div>
            ) : (
              <div className="text-center mb-12 md:mb-16">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold mb-6" style={{ backgroundColor: colors.accent + '15', color: colors.accent }}>
                  <Zap className="w-4 h-4" />
                  Beneficios
                </span>
                <div className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: template.fonts.heading, color: colors.primary }}>
                  <EditableText value={content.servicesTitle || '¿Por qué elegirnos?'} onChange={(val) => handleContentChange('servicesTitle', val)} editMode={editMode} />
                </div>
                <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: colors.secondary }}>Descubre todo lo que podemos hacer por ti</p>
              </div>
            )}
            
            {/* Cards según template */}
            <div className={`grid gap-6 ${
              template.style === 'minimal' ? 'grid-cols-1 md:grid-cols-2 gap-8' :
              template.style === 'energetic' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4' :
              template.style === 'artisan' ? 'grid-cols-1 md:grid-cols-2 gap-8' :
              template.style === 'tech' ? 'grid-cols-1 md:grid-cols-2 gap-6' :
              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'
            }`}>
              {content.services.slice(0, 4).map((service, index) => {
                const ServiceIcon = [Target, Lightbulb, Shield, TrendingUp][index] || Star;
                
                if (template.style === 'minimal') {
                  return (
                    <div key={index} className="group flex gap-6 p-6 border-b" style={{ borderColor: colors.primary + '10' }}>
                      <div className="flex-shrink-0">
                        <span className="text-4xl font-light" style={{ color: colors.primary }}>0{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-medium mb-3" style={{ color: colors.primary }}>
                          <EditableText value={service.title} onChange={(val) => { if (onContentChange) { const newServices = [...content.services]; newServices[index] = { ...newServices[index], title: val }; onContentChange('services', JSON.stringify(newServices)); } }} editMode={editMode} />
                        </h3>
                        <p className="text-base leading-relaxed" style={{ color: colors.secondary }}>
                          <EditableText value={service.description} onChange={(val) => { if (onContentChange) { const newServices = [...content.services]; newServices[index] = { ...newServices[index], description: val }; onContentChange('services', JSON.stringify(newServices)); } }} editMode={editMode} multiline />
                        </p>
                      </div>
                    </div>
                  );
                }
                
                if (template.style === 'energetic') {
                  return (
                    <div key={index} className="group p-5 rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                      <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                        <ServiceIcon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-base font-bold uppercase mb-2" style={{ color: colors.primary }}>
                        <EditableText value={service.title} onChange={(val) => { if (onContentChange) { const newServices = [...content.services]; newServices[index] = { ...newServices[index], title: val }; onContentChange('services', JSON.stringify(newServices)); } }} editMode={editMode} />
                      </h3>
                      <p className="text-sm leading-relaxed" style={{ color: colors.secondary }}>
                        <EditableText value={service.description} onChange={(val) => { if (onContentChange) { const newServices = [...content.services]; newServices[index] = { ...newServices[index], description: val }; onContentChange('services', JSON.stringify(newServices)); } }} editMode={editMode} multiline />
                      </p>
                    </div>
                  );
                }
                
                if (template.style === 'artisan') {
                  return (
                    <div key={index} className="group p-8 rounded-[30px] bg-white border-2 hover:shadow-xl transition-all duration-300" style={{ borderColor: colors.primary + '10' }}>
                      <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors.primary + '10' }}>
                          <ServiceIcon className="w-7 h-7" style={{ color: colors.primary }} />
                        </div>
                        <div>
                          <h3 className="text-xl font-serif mb-3" style={{ color: colors.primary }}>
                            <EditableText value={service.title} onChange={(val) => { if (onContentChange) { const newServices = [...content.services]; newServices[index] = { ...newServices[index], title: val }; onContentChange('services', JSON.stringify(newServices)); } }} editMode={editMode} />
                          </h3>
                          <p className="text-base leading-loose italic" style={{ color: colors.secondary }}>
                            <EditableText value={service.description} onChange={(val) => { if (onContentChange) { const newServices = [...content.services]; newServices[index] = { ...newServices[index], description: val }; onContentChange('services', JSON.stringify(newServices)); } }} editMode={editMode} multiline />
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                if (template.style === 'tech') {
                  return (
                    <div key={index} className="group p-6 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:border-opacity-100" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.primary + '30' }}>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${colors.primary}30, ${colors.accent}30)` }}>
                          <ServiceIcon className="w-6 h-6" style={{ color: colors.primary }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.accent }} />
                            <h3 className="text-lg font-bold text-white">
                              <EditableText value={service.title} onChange={(val) => { if (onContentChange) { const newServices = [...content.services]; newServices[index] = { ...newServices[index], title: val }; onContentChange('services', JSON.stringify(newServices)); } }} editMode={editMode} />
                            </h3>
                          </div>
                          <p className="text-sm leading-relaxed text-white opacity-60">
                            <EditableText value={service.description} onChange={(val) => { if (onContentChange) { const newServices = [...content.services]; newServices[index] = { ...newServices[index], description: val }; onContentChange('services', JSON.stringify(newServices)); } }} editMode={editMode} multiline />
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // CORPORATE (default)
                return (
                  <div key={index} className="group relative p-6 md:p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-transparent transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(135deg, ${colors.primary}08, ${colors.accent}08)` }} />
                    <div className="relative">
                      <div className="w-14 h-14 md:w-16 md:h-16 mb-5 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}15)` }}>
                        <ServiceIcon className="w-7 h-7 md:w-8 md:h-8" style={{ color: colors.primary }} />
                      </div>
                      <span className="absolute top-0 right-0 text-5xl font-bold opacity-5" style={{ color: colors.primary }}>0{index + 1}</span>
                      <h3 className="text-lg md:text-xl font-bold mb-3" style={{ color: colors.primary }}>
                        <EditableText value={service.title} onChange={(val) => { if (onContentChange) { const newServices = [...content.services]; newServices[index] = { ...newServices[index], title: val }; onContentChange('services', JSON.stringify(newServices)); } }} editMode={editMode} />
                      </h3>
                      <p className="text-sm md:text-base leading-relaxed" style={{ color: colors.secondary }}>
                        <EditableText value={service.description} onChange={(val) => { if (onContentChange) { const newServices = [...content.services]; newServices[index] = { ...newServices[index], description: val }; onContentChange('services', JSON.stringify(newServices)); } }} editMode={editMode} multiline />
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============ PRODUCTS SECTION ============ */}
      {products.length > 0 && (
        <section className={`px-4 md:px-6 ${
          template.style === 'minimal' ? 'py-20 md:py-32' :
          template.style === 'energetic' ? 'py-12 md:py-20' :
          template.style === 'artisan' ? 'py-16 md:py-24' :
          template.style === 'tech' ? 'py-16 md:py-28' :
          'py-12 md:py-20'
        }`} style={{
          backgroundColor: template.style === 'tech' ? '#111' :
                          template.style === 'energetic' ? colors.accent + '10' :
                          template.style === 'artisan' ? '#fdfcfa' : 'transparent'
        }}>
          <div className={`mx-auto ${template.style === 'minimal' ? 'max-w-4xl' : 'max-w-5xl'}`}>
            {/* Header según template */}
            <div className={`mb-6 md:mb-12 ${template.style === 'minimal' ? 'text-left' : 'text-center'}`}>
              {template.style === 'minimal' ? (
                <>
                  <div className="w-12 h-[1px] mb-6" style={{ backgroundColor: colors.primary }} />
                  <h2 className="text-3xl md:text-4xl font-light tracking-tight" style={{ fontFamily: 'Georgia, serif', color: colors.primary }}>Productos</h2>
                </>
              ) : template.style === 'energetic' ? (
                <>
                  <span className="inline-block px-4 py-2 rounded-full text-xs font-bold uppercase text-white mb-4" style={{ backgroundColor: colors.primary }}>🔥 Catálogo</span>
                  <h2 className="text-2xl md:text-4xl font-black uppercase" style={{ color: colors.primary }}>Nuestros Productos</h2>
                </>
              ) : template.style === 'artisan' ? (
                <>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Package className="w-5 h-5" style={{ color: colors.accent }} />
                  </div>
                  <h2 className="text-2xl md:text-4xl font-serif" style={{ color: colors.primary }}>Nuestros Productos</h2>
                </>
              ) : template.style === 'tech' ? (
                <>
                  <span className="inline-block text-xs font-mono px-2 py-1 rounded mb-4" style={{ backgroundColor: colors.primary + '20', color: colors.primary }}>&lt;products/&gt;</span>
                  <h2 className="text-2xl md:text-4xl font-bold text-white">Nuestros Productos</h2>
                </>
              ) : (
                <>
                  <span className="inline-block px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold mb-4 md:mb-6" style={{ backgroundColor: colors.accent + '20', color: colors.accent }}>Catálogo</span>
                  <h2 className="text-2xl md:text-4xl font-bold" style={{ fontFamily: template.fonts.heading, color: colors.primary }}>Nuestros Productos</h2>
                </>
              )}
            </div>
            
            {/* Grid según template */}
            <div className={`grid gap-3 md:gap-6 ${
              template.style === 'minimal' ? 'grid-cols-1 md:grid-cols-2 gap-8' :
              template.style === 'energetic' ? 'grid-cols-2 md:grid-cols-4 gap-3' :
              template.style === 'artisan' ? 'grid-cols-1 md:grid-cols-3 gap-6' :
              template.style === 'tech' ? 'grid-cols-2 md:grid-cols-3 gap-4' :
              'grid-cols-2 md:grid-cols-3 gap-3 md:gap-6'
            }`}>
              {products.map((product) => (
                <div 
                  key={product.id} 
                  onClick={() => {
                    setSelectedProduct(product);
                    setShowProductDetailModal(true);
                  }}
                  className={`group cursor-pointer ${
                  template.style === 'minimal' ? 'flex gap-6 items-start pb-6 border-b' :
                  template.style === 'energetic' ? 'bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all' :
                  template.style === 'artisan' ? 'bg-white rounded-[24px] overflow-hidden border-2 hover:shadow-xl transition-all' :
                  template.style === 'tech' ? 'rounded-xl overflow-hidden border backdrop-blur-sm hover:border-opacity-100 transition-all' :
                  'bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all'
                }`} style={{
                  borderColor: template.style === 'artisan' ? colors.primary + '10' : template.style === 'tech' ? colors.primary + '30' : undefined,
                  backgroundColor: template.style === 'tech' ? 'rgba(255,255,255,0.03)' : undefined
                }}>
                  {template.style === 'minimal' ? (
                    <>
                      <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" /> : <Package className="w-8 h-8 text-gray-300 m-auto mt-6" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-lg mb-1" style={{ color: colors.primary }}>{product.name}</h3>
                        {product.description && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{product.description}</p>}
                        <span className="font-light text-xl" style={{ color: colors.accent }}>${product.price.toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`relative overflow-hidden ${
                        template.style === 'energetic' ? 'aspect-square' :
                        template.style === 'artisan' ? 'aspect-[4/3]' :
                        template.style === 'tech' ? 'aspect-video' :
                        'aspect-square'
                      } bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center`}>
                        {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" /> : <Package className={`${template.style === 'tech' ? 'w-8 h-8' : 'w-10 h-10 md:w-16 md:h-16'} text-gray-300`} />}
                        {product.featured && (
                          <div className={`absolute top-2 left-2 px-2 py-0.5 text-[10px] md:text-xs font-bold text-white flex items-center gap-1 ${template.style === 'artisan' ? 'rounded-full' : template.style === 'tech' ? 'rounded font-mono' : 'rounded-full'}`} style={{ backgroundColor: colors.accent }}>
                            <Star className="w-2.5 h-2.5 md:w-3 md:h-3 fill-current" />
                            <span className="hidden sm:inline">{template.style === 'tech' ? 'FEATURED' : 'Destacado'}</span>
                          </div>
                        )}
                        {product.originalPrice && <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-bold text-white bg-red-500">-{Math.round((1 - product.price / product.originalPrice) * 100)}%</div>}
                      </div>
                      <div className={`${
                        template.style === 'energetic' ? 'p-3' :
                        template.style === 'artisan' ? 'p-5' :
                        template.style === 'tech' ? 'p-3' :
                        'p-2.5 md:p-4'
                      }`}>
                        <h3 className={`mb-0.5 line-clamp-1 md:line-clamp-2 ${
                          template.style === 'energetic' ? 'font-bold text-sm uppercase' :
                          template.style === 'artisan' ? 'font-serif text-lg' :
                          template.style === 'tech' ? 'font-mono text-sm text-white' :
                          'font-semibold text-sm md:text-base'
                        }`} style={{ color: template.style === 'tech' ? 'white' : colors.primary }}>{product.name}</h3>
                        {product.description && <p className={`mb-1.5 line-clamp-1 md:line-clamp-2 hidden sm:block ${template.style === 'tech' ? 'text-white opacity-50 text-xs' : 'text-[11px] md:text-xs text-gray-500'}`}>{product.description}</p>}
                        <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                          <span className={`font-bold ${template.style === 'tech' ? 'font-mono text-base' : 'text-base md:text-xl'}`} style={{ color: colors.accent }}>${product.price.toLocaleString()}</span>
                          {product.originalPrice && <span className="text-[10px] md:text-sm line-through text-gray-400">${product.originalPrice.toLocaleString()}</span>}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ APPOINTMENT SERVICES SECTION ============ */}
      {appointmentServices && appointmentServices.length > 0 && (
        <section className="py-16 md:py-24 px-4 md:px-6 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-4xl mx-auto">
            {/* Header corporativo */}
            <div className="text-center mb-12 md:mb-16">
              <h2 
                className="text-3xl md:text-5xl font-bold mb-4"
                style={{ fontFamily: template.fonts.heading, color: colors.primary }}
              >
                Nuestros Servicios
              </h2>
              <div 
                className="w-20 h-1 mx-auto rounded-full mb-6"
                style={{ backgroundColor: colors.accent }}
              />
              <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
                Soluciones profesionales diseñadas para satisfacer tus necesidades
              </p>
            </div>
            
            {/* Lista de servicios - Diseño corporativo */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-10">
              {appointmentServices.filter(s => s.active).map((service, index, arr) => (
                <div 
                  key={service.id} 
                  className={`flex items-center gap-4 p-5 md:p-6 ${index !== arr.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50 transition-colors`}
                >
                  {/* Imagen o indicador de color */}
                  {service.image ? (
                    <img 
                      src={service.image} 
                      alt={service.name}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: service.color || colors.accent }}
                    />
                  )}
                  
                  {/* Info del servicio */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base md:text-lg" style={{ color: colors.primary }}>
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                        {service.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="hidden md:flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      {service.duration >= 60 
                        ? `${Math.floor(service.duration / 60)}h${service.duration % 60 > 0 ? ` ${service.duration % 60}min` : ''}`
                        : `${service.duration} min`
                      }
                    </span>
                    {service.modality === 'virtual' && (
                      <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                        Virtual
                      </span>
                    )}
                    {service.modality === 'presencial' && (
                      <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
                        Presencial
                      </span>
                    )}
                    {service.modality === 'ambos' && (
                      <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-100">
                        Híbrido
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Botón único de agendar */}
            <div className="text-center">
              <button
                onClick={() => setShowBookingModal(true)}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-white text-lg transition-all hover:scale-105 hover:shadow-xl shadow-lg"
                style={{ backgroundColor: colors.accent }}
              >
                <CalendarDays className="w-6 h-6" />
                Agendar Cita
              </button>
              
              {/* WhatsApp secundario */}
              {business.whatsapp && (
                <div className="mt-6">
                  <p className="text-sm text-gray-400 mb-2">
                    ¿Prefieres contactarnos directamente?
                  </p>
                  <button
                    onClick={() => window.open(`https://wa.me/${business.whatsapp?.replace(/[^0-9]/g, '')}`, '_blank')}
                    className="inline-flex items-center gap-2 text-sm font-medium transition hover:opacity-80"
                    style={{ color: colors.accent }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Escríbenos por WhatsApp
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      
      {/* ============ TESTIMONIALS SECTION ============ */}
      {content.testimonials && content.testimonials.length > 0 && (
        <section className="py-12 md:py-20 px-4 md:px-6" style={{ backgroundColor: colors.primary + '05' }}>
          <div className="max-w-4xl mx-auto">
            {/* Banner de preview - solo visible en modo edición */}
            {editMode && (
              <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Eye className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-800">Vista previa de testimonios</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Estos son testimonios de ejemplo generados por IA para que veas cómo se verán las reseñas de tus clientes. 
                    Cuando publiques tu sitio, podrás agregar testimonios reales.
                  </p>
                </div>
              </div>
            )}
            
            <div className="text-center mb-6 md:mb-12">
              <span 
                className="inline-block px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold mb-4 md:mb-6"
                style={{ backgroundColor: colors.accent + '20', color: colors.accent }}
              >
                Testimonios
              </span>
              
              <h2 
                className="text-2xl md:text-4xl font-bold"
                style={{ fontFamily: template.fonts.heading, color: colors.primary }}
              >
                Lo que dicen nuestros clientes
              </h2>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {content.testimonials.slice(0, 3).map((testimonial, index) => (
                <div key={index} className="bg-white p-4 rounded-xl shadow-md relative">
                  {/* Indicador de ejemplo en modo edición */}
                  {editMode && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-medium rounded-full">
                      Ejemplo
                    </span>
                  )}
                  <div className="flex items-start gap-3">
                    {(testimonial as any).avatar ? (
                      <img 
                        src={(testimonial as any).avatar} 
                        alt={testimonial.name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm"
                        style={{ backgroundColor: colors.accent }}
                      >
                        {testimonial.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm" style={{ color: colors.primary }}>
                          {testimonial.name}
                        </p>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i}
                              className={`w-3 h-3 ${i < testimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
                        "{testimonial.text}"
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ CONTACT/CTA SECTION ============ */}
      <section className={`px-4 md:px-6 relative overflow-hidden ${
        template.style === 'minimal' ? 'py-20 md:py-32' :
        template.style === 'energetic' ? 'py-12 md:py-20' :
        template.style === 'artisan' ? 'py-16 md:py-24' :
        template.style === 'tech' ? 'py-16 md:py-28' :
        'py-16 md:py-28'
      }`} style={{ 
        background: template.style === 'minimal' ? '#fff' :
                   template.style === 'energetic' ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 100%)` :
                   template.style === 'artisan' ? '#faf8f5' :
                   template.style === 'tech' ? '#000' :
                   `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary || colors.primary}dd 50%, ${colors.primary}ee 100%)`
      }}>
        {/* Elementos decorativos según template */}
        {template.style === 'energetic' && (
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 30px, rgba(255,255,255,0.1) 30px, rgba(255,255,255,0.1) 60px)` }} />
        )}
        {template.style === 'tech' && (
          <>
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `radial-gradient(${colors.primary} 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)` }} />
          </>
        )}
        {template.style === 'corporate' && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
          </div>
        )}
        
        <div className={`mx-auto relative z-10 ${template.style === 'minimal' ? 'max-w-3xl' : 'max-w-4xl'}`}>
          {template.style === 'minimal' ? (
            /* MINIMAL CTA */
            <div className="text-center">
              <div className="w-16 h-[1px] mx-auto mb-10" style={{ backgroundColor: colors.primary }} />
              <h2 className="text-3xl md:text-5xl font-light tracking-tight mb-6" style={{ fontFamily: 'Georgia, serif', color: colors.primary }}>¿Listo para comenzar?</h2>
              <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">Contáctanos y descubre cómo podemos ayudarte.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10">
                {business.phone && <span className="flex items-center gap-2 text-sm" style={{ color: colors.primary }}><Phone className="w-4 h-4" /> {business.phone}</span>}
                {business.email && <span className="flex items-center gap-2 text-sm" style={{ color: colors.primary }}><MessageSquare className="w-4 h-4" /> {business.email}</span>}
              </div>
              {business.whatsapp && (
                <button className="inline-flex items-center gap-3 px-8 py-4 rounded-none border-2 font-medium transition-all hover:bg-gray-900 hover:text-white hover:border-gray-900" style={{ borderColor: colors.primary, color: colors.primary }}>
                  <MessageSquare className="w-5 h-5" />
                  Escríbenos
                </button>
              )}
            </div>
          ) : template.style === 'energetic' ? (
            /* ENERGETIC CTA */
            <div className="text-center">
              <div className="inline-block px-4 py-2 rounded-full bg-white/20 text-white text-sm font-bold uppercase mb-6">🚀 ¡Contáctanos!</div>
              <h2 className="text-3xl md:text-5xl font-black uppercase text-white mb-4">¿Listo para comenzar?</h2>
              <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">¡No esperes más! Escríbenos y hagamos realidad tu proyecto.</p>
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {business.phone && <span className="px-4 py-2 rounded-full bg-white/10 text-white text-sm font-bold">{business.phone}</span>}
                {business.email && <span className="px-4 py-2 rounded-full bg-white/10 text-white text-sm font-bold">{business.email}</span>}
              </div>
              {business.whatsapp && (
                <button className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-white font-black text-lg uppercase shadow-2xl hover:scale-110 transition-transform" style={{ color: colors.primary }}>
                  <MessageSquare className="w-6 h-6" />
                  ESCRÍBENOS YA
                  <ArrowRight className="w-6 h-6" />
                </button>
              )}
            </div>
          ) : template.style === 'artisan' ? (
            /* ARTISAN CTA */
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="w-12 h-[1px]" style={{ backgroundColor: colors.primary }} />
                <MessageSquare className="w-6 h-6" style={{ color: colors.accent }} />
                <div className="w-12 h-[1px]" style={{ backgroundColor: colors.primary }} />
              </div>
              <h2 className="text-3xl md:text-4xl font-serif mb-6" style={{ color: colors.primary }}>¿Listo para comenzar?</h2>
              <p className="text-lg italic mb-8 max-w-xl mx-auto leading-loose" style={{ color: colors.secondary }}>Estamos aquí para ayudarte. Contáctanos y hagamos realidad tu visión.</p>
              <div className="inline-block bg-white rounded-[30px] p-8 shadow-xl border-2 mb-8" style={{ borderColor: colors.primary + '20' }}>
                <div className="flex flex-col gap-4">
                  {business.phone && <span className="flex items-center gap-3 text-base" style={{ color: colors.primary }}><Phone className="w-5 h-5" style={{ color: colors.accent }} /> {business.phone}</span>}
                  {business.email && <span className="flex items-center gap-3 text-base" style={{ color: colors.primary }}><MessageSquare className="w-5 h-5" style={{ color: colors.accent }} /> {business.email}</span>}
                </div>
              </div>
              {business.whatsapp && (
                <div>
                  <button className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-serif text-lg text-white shadow-lg transition-all hover:scale-105" style={{ backgroundColor: '#25D366' }}>
                    Escríbenos por WhatsApp
                  </button>
                </div>
              )}
            </div>
          ) : template.style === 'tech' ? (
            /* TECH CTA */
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="inline-block text-xs font-mono px-2 py-1 rounded mb-4" style={{ backgroundColor: colors.primary + '20', color: colors.primary }}>&lt;contact/&gt;</span>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">¿Listo para comenzar?</h2>
                <p className="text-base text-white/60 mb-6">Inicia tu proyecto con nosotros. Estamos listos para ayudarte.</p>
                <div className="space-y-3 mb-6">
                  {business.phone && <div className="flex items-center gap-3"><span className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: colors.primary + '20' }}><Phone className="w-4 h-4" style={{ color: colors.primary }} /></span><span className="text-white font-mono text-sm">{business.phone}</span></div>}
                  {business.email && <div className="flex items-center gap-3"><span className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: colors.primary + '20' }}><MessageSquare className="w-4 h-4" style={{ color: colors.primary }} /></span><span className="text-white font-mono text-sm">{business.email}</span></div>}
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl opacity-20" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }} />
                <div className="relative backdrop-blur-sm rounded-2xl p-8 border text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.primary + '30' }}>
                  {business.whatsapp && (
                    <button className="w-full py-4 rounded-lg font-mono font-bold text-white transition-all hover:scale-105" style={{ backgroundColor: '#25D366' }}>
                      Enviar WhatsApp
                    </button>
                  )}
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/40">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors.accent }} />
                    <span className="font-mono">STATUS: ONLINE</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* CORPORATE CTA (default) */
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/10 backdrop-blur mb-6 md:mb-8">
                <Rocket className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 text-white leading-tight" style={{ fontFamily: template.fonts.heading }}>¿Listo para comenzar?</h2>
              <p className="text-base md:text-xl text-white/80 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">Estamos aquí para ayudarte. Contáctanos y descubre cómo podemos hacer realidad lo que necesitas.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 md:mb-12 max-w-3xl mx-auto">
                {business.phone && <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10"><Phone className="w-5 h-5 text-white/80 mx-auto mb-2" /><span className="text-white text-sm md:text-base">{business.phone}</span></div>}
                {business.email && <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10"><MessageSquare className="w-5 h-5 text-white/80 mx-auto mb-2" /><span className="text-white text-sm md:text-base line-clamp-1">{business.email}</span></div>}
                {business.address && <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10"><MapPin className="w-5 h-5 text-white/80 mx-auto mb-2" /><span className="text-white text-sm md:text-base line-clamp-1">{business.address}</span></div>}
              </div>
              <div className="flex items-center justify-center gap-4 mb-8 md:mb-10">
                {business.instagram && <a href={`https://instagram.com/${business.instagram}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all hover:scale-110"><Instagram className="w-5 h-5 md:w-6 md:h-6" /></a>}
                {business.facebook && <a href={business.facebook} target="_blank" rel="noopener noreferrer" className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all hover:scale-110"><Facebook className="w-5 h-5 md:w-6 md:h-6" /></a>}
              </div>
              {business.whatsapp && (
                <button className="group inline-flex items-center gap-3 md:gap-4 px-8 py-4 md:px-12 md:py-5 rounded-full font-bold text-base md:text-xl shadow-2xl transition-all duration-300 hover:scale-105" style={{ backgroundColor: '#25D366', color: '#fff', boxShadow: '0 20px 50px rgba(37, 211, 102, 0.3)' }}>
                  <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
                  Escríbenos por WhatsApp
                  <ArrowRight className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:translate-x-1" />
                </button>
              )}
            </div>
          )}
        </div>
      </section>
      
      {/* ============ FOOTER ============ */}
      <footer className={`px-6 ${
        template.style === 'minimal' ? 'py-12 md:py-16' :
        template.style === 'energetic' ? 'py-6 md:py-8' :
        template.style === 'artisan' ? 'py-10 md:py-14' :
        template.style === 'tech' ? 'py-8 md:py-12' :
        'py-8 md:py-12'
      }`} style={{ 
        backgroundColor: template.style === 'minimal' ? '#fff' :
                        template.style === 'artisan' ? '#faf8f5' :
                        template.style === 'tech' ? '#000' :
                        colors.primary 
      }}>
        <div className={`mx-auto ${template.style === 'minimal' ? 'max-w-3xl' : 'max-w-5xl'}`}>
          {template.style === 'minimal' ? (
            <div className="text-center">
              <div className="w-12 h-[1px] mx-auto mb-6" style={{ backgroundColor: colors.primary + '30' }} />
              <p className="text-sm" style={{ color: colors.secondary }}>© {new Date().getFullYear()} {business.name}</p>
              <p className="text-xs mt-2" style={{ color: colors.secondary + '80' }}>Hecho con Quantum AI Web Engine</p>
            </div>
          ) : template.style === 'energetic' ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
              <div className="flex items-center gap-3">
                {business.logo ? <img src={business.logo} alt={business.name} className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black" style={{ backgroundColor: colors.accent }}>{business.name.charAt(0)}</div>}
                <span className="text-white font-black uppercase">{business.name}</span>
              </div>
              <p className="text-white/60 text-sm">© {new Date().getFullYear()} • Quantum AI Web Engine</p>
            </div>
          ) : template.style === 'artisan' ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-8 h-[1px]" style={{ backgroundColor: colors.primary + '30' }} />
                <span className="text-sm italic" style={{ color: colors.secondary }}>{business.name}</span>
                <div className="w-8 h-[1px]" style={{ backgroundColor: colors.primary + '30' }} />
              </div>
              <p className="text-sm" style={{ color: colors.secondary }}>© {new Date().getFullYear()} Todos los derechos reservados</p>
              <p className="text-xs mt-2 italic" style={{ color: colors.secondary + '80' }}>Hecho con Quantum AI Web Engine</p>
            </div>
          ) : template.style === 'tech' ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors.primary }} />
                <span className="text-white font-mono text-sm">{business.name}</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-white/50">
                <span>© {new Date().getFullYear()}</span>
                <span>|</span>
                <span>Quantum AI Web Engine</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  {business.logo ? <img src={business.logo} alt={business.name} className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: colors.accent }}>{business.name.charAt(0)}</div>}
                  <span className="text-white font-bold text-lg">{business.name}</span>
                </div>
                <div className="flex items-center gap-6 text-sm text-white/70">
                  {business.phone && <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> {business.phone}</span>}
                  {business.email && <span className="flex items-center gap-2 hidden md:flex"><MessageSquare className="w-4 h-4" /> {business.email}</span>}
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
                <p className="text-white/60 text-sm">© {new Date().getFullYear()} {business.name}. Todos los derechos reservados.</p>
                <p className="text-white/50 text-xs">Hecho con <span className="text-white/70 font-medium">Quantum AI Web Engine</span></p>
              </div>
            </>
          )}
        </div>
      </footer>

      {/* ============ MODAL DE AGENDAMIENTO ============ */}
      <AnimatePresence>
        {showBookingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowBookingModal(false);
              setSelectedService(null);
              setSelectedTime(null);
              setBookingStep('select');
              setCustomerName('');
              setCustomerPhone('');
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b" style={{ backgroundColor: colors.accent + '10' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: colors.accent }}>
                      <CalendarDays className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Agendar Cita</h3>
                      <p className="text-sm text-gray-500">{bookingStep === 'select' ? 'Selecciona servicio, fecha y hora' : 'Ingresa tus datos de contacto'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowBookingModal(false);
                      setSelectedService(null);
                      setSelectedTime(null);
                      setBookingStep('select');
                      setCustomerName('');
                      setCustomerPhone('');
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-5">
                {/* Paso 1: Seleccionar Servicio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    1. Selecciona un servicio
                  </label>
                  <div className="space-y-2">
                    {appointmentServices.filter(s => s.active).map((service) => (
                      <button
                        key={service.id}
                        onClick={() => {
                          setSelectedService(service);
                          setSelectedTime(null);
                        }}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          selectedService?.id === service.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex gap-4 items-start">
                          {/* Imagen del servicio */}
                          {service.image && (
                            <img 
                              src={service.image} 
                              alt={service.name}
                              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-gray-900">{service.name}</h4>
                              {service.description && (
                                <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {service.duration} min
                                </span>
                                <span className={`px-2 py-0.5 rounded-full ${
                                  service.modality === 'presencial' ? 'bg-blue-100 text-blue-600' :
                                  service.modality === 'virtual' ? 'bg-purple-100 text-purple-600' :
                                  'bg-cyan-100 text-cyan-600'
                                }`}>
                                {service.modality === 'presencial' ? '📍 Presencial' :
                                 service.modality === 'virtual' ? '🎥 Virtual' : '🔄 Híbrido'}
                              </span>
                            </div>
                          </div>
                          <span className="font-bold flex-shrink-0" style={{ color: colors.accent }}>
                            {service.price === 0 ? 'Cotizar' : `$${service.price.toLocaleString()}`}
                          </span>
                        </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paso 2: Seleccionar Fecha y Hora */}
                {selectedService && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      2. Selecciona fecha y hora
                    </label>
                    
                    {/* Selector de fecha */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-600">Fecha</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {[...Array(7)].map((_, i) => {
                          const date = new Date();
                          date.setDate(date.getDate() + i);
                          const isSelected = selectedDate.toDateString() === date.toDateString();
                          const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                setSelectedDate(new Date(date));
                                setSelectedTime(null);
                              }}
                              className={`flex-shrink-0 w-16 py-3 rounded-xl border-2 text-center transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="text-xs text-gray-500">{dayNames[date.getDay()]}</div>
                              <div className={`text-lg font-bold ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>
                                {date.getDate()}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Horarios disponibles */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-600">Horarios disponibles</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {(() => {
                          // Generar horarios según el día seleccionado
                          const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                          const dayName = dayNames[selectedDate.getDay()];
                          
                          // Horarios de ejemplo basados en el día
                          const schedules: { [key: string]: string[] } = {
                            lunes: ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00', '19:00'],
                            martes: ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00', '19:00'],
                            miercoles: ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00', '19:00'],
                            jueves: ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00', '19:00'],
                            viernes: ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00', '19:00'],
                            sabado: ['10:00', '11:00', '12:00', '13:00'],
                            domingo: [],
                          };
                          
                          const times = schedules[dayName] || [];
                          
                          if (times.length === 0) {
                            return (
                              <div className="col-span-4 text-center py-6 text-gray-500">
                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No hay horarios disponibles este día</p>
                              </div>
                            );
                          }
                          
                          return times.map((time) => (
                            <button
                              key={time}
                              onClick={() => setSelectedTime(time)}
                              className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                                selectedTime === time
                                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
                              }`}
                            >
                              {time}
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Paso 3: Datos de contacto */}
                {bookingStep === 'contact' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">3</span>
                      Tus datos de contacto
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Tu nombre</label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Ej: Juan Pérez"
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Tu WhatsApp <span className="text-red-500">*</span></label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="Ej: 8112345678"
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-1">Te enviaremos confirmación y recordatorio</p>
                      </div>
                    </div>
                    
                    {/* Resumen */}
                    <div className="bg-blue-50 rounded-xl p-4 mt-4">
                      <p className="text-sm font-medium text-blue-900 mb-2">📋 Resumen de tu cita:</p>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>• <strong>Servicio:</strong> {selectedService?.name}</p>
                        <p>• <strong>Fecha:</strong> {selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        <p>• <strong>Hora:</strong> {selectedTime}</p>
                        <p>• <strong>Precio:</strong> {selectedService?.price === 0 ? 'Solicitar Cotización' : `$${selectedService?.price}`}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 border-t bg-gray-50">
                {bookingStep === 'select' ? (
                  <button
                    onClick={() => setBookingStep('contact')}
                    disabled={!selectedService || !selectedTime}
                    className="w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: selectedService && selectedTime ? colors.accent : '#9CA3AF' }}
                  >
                    {selectedService && selectedTime ? 'Continuar →' : 'Selecciona servicio y horario'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={async () => {
                        if (selectedService && selectedTime && customerPhone) {
                          const dateStr = selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
                          
                          try {
                            const response = await fetch('/api/quantum-web/send-appointment', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                phoneNumber: business.whatsapp?.replace(/[^0-9]/g, '') || '',
                                businessName: content.heroTitle || business.name,
                                businessPhone: business.whatsapp?.replace(/[^0-9]/g, '') || '',
                                serviceName: selectedService.name,
                                serviceDescription: selectedService.description,
                                serviceDuration: selectedService.duration,
                                servicePrice: selectedService.price,
                                date: dateStr,
                                time: selectedTime,
                                customerName: customerName,
                                customerPhone: customerPhone.replace(/[^0-9]/g, '').startsWith('52') 
                                  ? customerPhone.replace(/[^0-9]/g, '') 
                                  : '52' + customerPhone.replace(/[^0-9]/g, '')
                              })
                            });
                            
                            const data = await response.json();
                            
                            if (data.success) {
                              alert('✅ ¡Cita solicitada!\n\nTe enviamos confirmación por WhatsApp.\nTe recordaremos 24 horas antes.');
                              setShowBookingModal(false);
                              setSelectedService(null);
                              setSelectedTime(null);
                              setCustomerName('');
                              setCustomerPhone('');
                              setBookingStep('select');
                            } else {
                              const message = `Hola, me gustaría agendar una cita:\n\n👤 Nombre: ${customerName}\n📱 Tel: ${customerPhone}\n📋 Servicio: ${selectedService.name}\n📅 Fecha: ${dateStr}\n🕐 Hora: ${selectedTime}`;
                              window.open(`https://wa.me/${business.whatsapp?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                              setShowBookingModal(false);
                              setSelectedService(null);
                              setSelectedTime(null);
                              setCustomerName('');
                              setCustomerPhone('');
                              setBookingStep('select');
                            }
                          } catch (error) {
                            const message = `Hola, me gustaría agendar una cita:\n\n👤 Nombre: ${customerName}\n📱 Tel: ${customerPhone}\n📋 Servicio: ${selectedService.name}\n📅 Fecha: ${dateStr}\n🕐 Hora: ${selectedTime}`;
                            window.open(`https://wa.me/${business.whatsapp?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                            setShowBookingModal(false);
                            setSelectedService(null);
                            setSelectedTime(null);
                            setCustomerName('');
                            setCustomerPhone('');
                            setBookingStep('select');
                          }
                        }
                      }}
                      disabled={!customerPhone}
                      className="w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ backgroundColor: customerPhone ? colors.accent : '#9CA3AF' }}
                    >
                      <MessageSquare className="w-5 h-5" />
                      Confirmar Cita
                    </button>
                    <button
                      onClick={() => setBookingStep('select')}
                      className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      ← Volver
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Detalle de Producto */}
      <AnimatePresence>
        {showProductDetailModal && selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowProductDetailModal(false);
              setSelectedProduct(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl"
            >
              {/* Imagen del producto */}
              <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200">
                {selectedProduct.image ? (
                  <img 
                    src={selectedProduct.image} 
                    alt={selectedProduct.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-24 h-24 text-gray-300" />
                  </div>
                )}
                {/* Botón cerrar */}
                <button
                  onClick={() => {
                    setShowProductDetailModal(false);
                    setSelectedProduct(null);
                  }}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
                {/* Badge destacado */}
                {selectedProduct.featured && (
                  <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-bold text-white flex items-center gap-1.5" style={{ backgroundColor: colors.accent }}>
                    <Star className="w-4 h-4 fill-current" />
                    Destacado
                  </div>
                )}
                {/* Badge descuento */}
                {selectedProduct.originalPrice && (
                  <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full text-sm font-bold text-white bg-red-500">
                    -{Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}% OFF
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-2" style={{ color: colors.primary }}>
                  {selectedProduct.name}
                </h2>
                
                {selectedProduct.description && (
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                )}

                {/* Precio */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl font-bold" style={{ color: colors.accent }}>
                    ${selectedProduct.price.toLocaleString()}
                  </span>
                  {selectedProduct.originalPrice && (
                    <span className="text-lg line-through text-gray-400">
                      ${selectedProduct.originalPrice.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Botón de compra */}
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/quantum-web/send-product-interest', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          phoneNumber: business.whatsapp?.replace(/[^0-9]/g, '') || '',
                          businessName: content.heroTitle || business.name,
                          businessPhone: business.whatsapp?.replace(/[^0-9]/g, '') || '',
                          productName: selectedProduct.name,
                          productDescription: selectedProduct.description,
                          productPrice: selectedProduct.price
                        })
                      });
                      
                      const data = await response.json();
                      
                      if (data.success) {
                        alert('✅ ¡Compra registrada!\n\nTe contactaremos por WhatsApp para coordinar el pago y envío.');
                        setShowProductDetailModal(false);
                        setSelectedProduct(null);
                      } else {
                        // Fallback - abrir WhatsApp
                        const message = `Hola, quiero comprar:\n\n🛍️ *${selectedProduct.name}*\n💰 Precio: $${selectedProduct.price.toLocaleString()}`;
                        window.open(`https://wa.me/${business.whatsapp?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                        alert('📱 Te contactaremos por WhatsApp pronto.');
                        setShowProductDetailModal(false);
                        setSelectedProduct(null);
                      }
                    } catch (error) {
                      const message = `Hola, quiero comprar:\n\n🛍️ *${selectedProduct.name}*\n💰 Precio: $${selectedProduct.price.toLocaleString()}`;
                      window.open(`https://wa.me/${business.whatsapp?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                      alert('📱 Te contactaremos por WhatsApp pronto.');
                      setShowProductDetailModal(false);
                      setSelectedProduct(null);
                    }
                  }}
                  className="w-full py-4 rounded-xl font-bold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2 text-lg"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <ShoppingCart className="w-6 h-6" />
                  Comprar
                </button>
                <p className="text-center text-xs text-gray-500 mt-2">
                  Te contactaremos por WhatsApp para coordinar
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
