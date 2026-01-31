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
  Briefcase
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
  const [step, setStep] = useState<'intro' | 'site-type' | 'template' | 'info' | 'content' | 'products' | 'preview' | 'published'>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Tipo de sitio: tienda o informativa
  const [siteType, setSiteType] = useState<'store' | 'informative' | null>(null);
  
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
  
  // Contenido generado por IA
  const [webContent, setWebContent] = useState<WebContent | null>(null);
  
  // Productos
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Preview mode
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  // MODO EDICIÓN - Para editar textos e imágenes inline
  const [editMode, setEditMode] = useState(false);
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
  
  // Cargar datos del perfil existente o del localStorage (idea millonaria)
  useEffect(() => {
    loadPrefillData();
    loadBusinessProfile();
  }, []);
  
  // Cargar datos precargados desde el flujo de "idea millonaria" o modo edición
  const loadPrefillData = () => {
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
        
        // Si es modo edición, cargar los datos completos del sitio
        if (data.editMode && data.existingSlug) {
          loadExistingSite(data.existingSlug);
        }
        
        // Limpiar localStorage después de usar
        localStorage.removeItem('quantum_web_prefill');
        
        // Si tiene datos, ir al paso de selección de tipo de sitio (no saltar directo a info)
        // El usuario necesita elegir si quiere página informativa o tienda, y el diseño
        if (data.name && !data.editMode) {
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
            setSiteType('store');
          } else {
            setSiteType('landing');
          }
          
          // Ir directo a la preview para editar
          setStep('preview');
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
          products
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
      className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center p-4"
    >
      <div className="max-w-2xl w-full text-center">
        {/* Logo animado */}
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-32 h-32 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center shadow-2xl shadow-purple-500/30"
        >
          <Globe className="w-16 h-16 text-white" />
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 mb-4"
        >
          QUANTUM AI WEB ENGINE
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl text-purple-200 mb-8"
        >
          Crea tu página web profesional con tienda en línea
          <br />
          <span className="text-purple-400 font-semibold">en menos de 5 minutos</span>
        </motion.p>
        
        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {[
            { icon: Wand2, label: 'IA Genera Todo', color: 'from-purple-500 to-pink-500' },
            { icon: Layout, label: '5 Templates Pro', color: 'from-blue-500 to-cyan-500' },
            { icon: ShoppingBag, label: 'Tienda Online', color: 'from-green-500 to-emerald-500' },
            { icon: Smartphone, label: '100% Responsivo', color: 'from-orange-500 to-red-500' }
          ].map((feature, i) => (
            <div key={i} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
              <div className={`w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
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
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-2xl shadow-purple-500/30 flex items-center gap-3 mx-auto hover:shadow-purple-500/50 transition-all"
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
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 px-4"
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
        
        {/* Options */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Tienda Online */}
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setSiteType('store');
              setStep('template');
            }}
            className={`relative p-8 rounded-3xl border-2 text-left transition-all ${
              siteType === 'store' 
                ? 'border-green-500 bg-green-500/10' 
                : 'border-slate-700 bg-slate-800/50 hover:border-green-500/50'
            }`}
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/30">
              <ShoppingBag className="w-10 h-10 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-3 text-center">Tienda Online</h3>
            <p className="text-slate-400 mb-6 text-center">
              Vende tus productos o servicios creados por ti directamente desde tu sitio web
            </p>
            
            <div className="space-y-3">
              {[
                'Catálogo de productos propios',
                'Precios y descripciones',
                'Botón de WhatsApp para comprar',
                'Galería de imágenes',
                'Ideal para: artesanos, chefs, diseñadores, creadores'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-400" />
                  </div>
                  {item}
                </div>
              ))}
            </div>
            
            <div className="mt-6 py-3 rounded-xl bg-green-500/20 text-green-400 font-semibold text-center">
              Incluye Catálogo de Productos
            </div>
            
            {/* Aviso de uso exclusivo */}
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-xs text-amber-300/90 text-center leading-relaxed">
                ⚠️ <strong>Uso exclusivo:</strong> Solo para productos o servicios fabricados, creados o hechos por ti mismo. 
                <span className="block mt-1 text-amber-400/70">
                  Prohibido: reventa de artículos, productos usados o electrónicos.
                </span>
              </p>
            </div>
          </motion.button>
          
          {/* Página Informativa */}
          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setSiteType('informative');
              setStep('template');
            }}
            className={`relative p-8 rounded-3xl border-2 text-left transition-all ${
              siteType === 'informative' 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-slate-700 bg-slate-800/50 hover:border-blue-500/50'
            }`}
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <FileText className="w-10 h-10 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-3 text-center">Página Informativa</h3>
            <p className="text-slate-400 mb-6 text-center">
              Presenta tu negocio, servicios y datos de contacto de forma profesional
            </p>
            
            <div className="space-y-3">
              {[
                'Información de tu negocio',
                'Servicios que ofreces',
                'Sobre nosotros',
                'Datos de contacto',
                'Ideal para: profesionales, consultores, agencias'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-blue-400" />
                  </div>
                  {item}
                </div>
              ))}
            </div>
            
            <div className="mt-6 py-3 rounded-xl bg-blue-500/20 text-blue-400 font-semibold text-center">
              Sin Catálogo de Productos
            </div>
          </motion.button>
        </div>
        
        {/* Note */}
        <p className="text-slate-500 text-sm">
          💡 No te preocupes, podrás cambiar esto después
        </p>
      </div>
    </motion.div>
  );
  
  // Selección de Template
  const renderTemplateSelection = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 px-4"
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
                  ? 'border-purple-500 shadow-xl shadow-purple-500/20'
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
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
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
                onClick={() => setStep('info')}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-2xl shadow-purple-500/30 flex items-center justify-center gap-3"
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
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 px-4"
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
              className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
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
              className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition resize-none"
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
              className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white focus:border-purple-500 transition"
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
                className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-purple-500 transition"
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
                className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-purple-500 transition"
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
                className="flex-1 p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-purple-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                className="px-4 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                title="Buscar en el mapa"
              >
                <Globe className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={getCurrentLocation}
                className="px-4 py-3 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition-colors"
                title="Usar mi ubicación actual"
              >
                <MapPin className="w-5 h-5" />
              </button>
            </div>
            {/* Mini mapa preview */}
            {addressLat && addressLon && (
              <div className="mt-3">
                <div 
                  className="relative h-24 rounded-xl overflow-hidden cursor-pointer group"
                  onClick={() => setShowMapModal(true)}
                >
                  <img 
                    src={`https://staticmap.openstreetmap.de/staticmap.php?center=${addressLat},${addressLon}&zoom=14&size=400x100&markers=${addressLat},${addressLon},red-pushpin`}
                    alt="Ubicación"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Editar ubicación</span>
                  </div>
                </div>
              </div>
            )}
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
                className="flex-1 p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 cursor-pointer hover:border-purple-500/50 transition"
              />
              <button
                type="button"
                onClick={() => setShowHorarioModal(true)}
                className="px-4 py-3 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/30 transition-colors"
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
                className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-purple-500 transition"
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
                className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-purple-500 transition"
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
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
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
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 px-4"
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
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 mb-4"
            />
            <p className="text-purple-300 font-medium">Generando contenido con IA...</p>
            <p className="text-slate-500 text-sm mt-2">Esto tomará unos segundos</p>
          </div>
        ) : webContent ? (
          <div className="space-y-6">
            {/* Hero Section */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-purple-400" />
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
              className="w-full py-3 rounded-xl border border-purple-500/50 text-purple-400 font-medium hover:bg-purple-500/10 transition flex items-center justify-center gap-2"
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
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3"
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
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3"
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
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 px-4"
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
            className="aspect-square bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center gap-3 hover:border-purple-500/50 hover:bg-purple-500/5 transition"
          >
            <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Plus className="w-7 h-7 text-purple-400" />
            </div>
            <span className="text-purple-300 font-medium text-sm">Agregar Producto</span>
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
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3"
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
      className="min-h-screen bg-slate-950"
    >
      {/* Toolbar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-700/50 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setStep('products')}
            className="text-slate-400 hover:text-white transition flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          
          {/* Device Toggle + Edit Mode */}
          <div className="flex items-center gap-3">
            {/* Edit Mode Toggle */}
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition ${
                editMode 
                  ? 'bg-orange-500 text-white' 
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
                className={`p-2 rounded-md transition ${previewMode === 'desktop' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Monitor className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-2 rounded-md transition ${previewMode === 'mobile' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Smartphone className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <button
            onClick={publishSite}
            disabled={isLoading}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Rocket className="w-4 h-4" />
            )}
            Publicar
          </button>
        </div>
      </div>
      
      {/* Preview Frame */}
      <div className="pt-20 pb-8 px-4 flex justify-center">
        <div
          className={`bg-white rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
            previewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-5xl'
          }`}
        >
          {selectedTemplate && webContent && (
            <WebsitePreview
              template={selectedTemplate}
              content={webContent}
              business={businessInfo}
              products={products}
              editMode={editMode}
              onContentChange={(field, value) => {
                setWebContent(prev => prev ? { ...prev, [field]: value } : null);
              }}
              onHeroImageChange={(url) => setHeroImage(url)}
              heroImage={heroImage}
            />
          )}
        </div>
      </div>
      
      {/* Tip de edición */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3"
          >
            <Edit3 className="w-5 h-5" />
            <span className="font-medium">Haz clic en cualquier texto o imagen para editarlo</span>
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
      className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center p-4"
    >
      <div className="max-w-lg w-full text-center">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center"
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
            <Globe className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <span className="text-white font-medium text-lg truncate">{publishedUrl}</span>
            <button
              onClick={() => navigator.clipboard.writeText(`https://${publishedUrl}`)}
              className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition flex-shrink-0"
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
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg flex items-center justify-center gap-3"
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
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-orange-500/25 transition-all"
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
  return (
    <>
      {step === 'intro' && renderIntro()}
      {step === 'site-type' && renderSiteTypeSelection()}
      {step === 'template' && renderTemplateSelection()}
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
              <div className="p-5 border-b border-slate-700/50 bg-gradient-to-r from-emerald-900/30 to-blue-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
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
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 animate-spin" />
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
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 text-white font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
              <div className="p-5 border-b border-slate-700/50 bg-gradient-to-r from-purple-900/30 to-pink-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
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
                      className="px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/30 transition text-sm font-medium"
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
                      // Generar string de horario compacto
                      const diasCortos: { [key: string]: string } = {
                        lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue',
                        viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom'
                      };
                      
                      const horarioGroups: { [horario: string]: string[] } = {};
                      Object.entries(horarioConfig).forEach(([dia, cfg]) => {
                        if (cfg.abierto) {
                          const key = `${cfg.desde}-${cfg.hasta}`;
                          if (!horarioGroups[key]) horarioGroups[key] = [];
                          horarioGroups[key].push(dia);
                        }
                      });
                      
                      const horarioStr = Object.entries(horarioGroups)
                        .map(([horario, dias]) => {
                          const diasStr = dias.map(d => diasCortos[d] || d).join('-');
                          return `${diasStr} ${horario}`;
                        })
                        .join(', ');
                      
                      setBusinessInfo(prev => ({ ...prev, schedule: horarioStr || 'Sin horario definido' }));
                      setShowHorarioModal(false);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
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
              className="w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-red-500/30 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header con ícono */}
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
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
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold hover:shadow-lg hover:shadow-red-500/25 transition-all flex items-center justify-center gap-2"
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
              <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-purple-500/50 transition">
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
                value={formData.price || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Precio Original</label>
              <input
                type="number"
                value={formData.originalPrice || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: parseFloat(e.target.value) || undefined }))}
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
                className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-slate-300">En stock</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500"
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
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium disabled:opacity-50"
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
  editMode = false,
  onContentChange,
  onHeroImageChange,
  heroImage: externalHeroImage
}: {
  template: QuantumTemplate;
  content: WebContent;
  business: BusinessInfo;
  products: Product[];
  editMode?: boolean;
  onContentChange?: (field: string, value: string) => void;
  onHeroImageChange?: (url: string) => void;
  heroImage?: string;
}) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const colors = template.colors;
  const isDarkTheme = template.style === 'energetic' || template.style === 'tech';
  const heroImage = externalHeroImage || (content as any).heroImage || PREVIEW_HERO_IMAGES[business.category || 'otro'] || PREVIEW_HERO_IMAGES.otro;
  
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
              
              {/* URL personalizada */}
              <div className="mb-6">
                <label className="text-sm text-slate-400 mb-2 block">URL de imagen personalizada</label>
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
                      heroImage === img.url ? 'border-purple-500' : 'border-transparent hover:border-slate-600'
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
      
      {/* ============ HERO SECTION - FULLSCREEN ============ */}
      <section className="relative min-h-[50vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background Image - con botón de editar */}
        <div className="absolute inset-0 group">
          <img 
            src={heroImage}
            alt="Hero background"
            className="w-full h-full object-cover"
          />
          <div 
            className="absolute inset-0"
            style={{
              background: isDarkTheme
                ? `linear-gradient(135deg, ${colors.primary}ee, ${colors.secondary}dd)`
                : `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.75))`
            }}
          />
          {/* Botón editar imagen */}
          {editMode && (
            <button
              onClick={() => setShowImageModal(true)}
              className="absolute top-4 right-4 bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 opacity-80 hover:opacity-100 transition z-20"
            >
              <ImageIcon className="w-4 h-4" />
              Cambiar imagen
            </button>
          )}
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 text-center py-10 md:py-16">
          {/* Logo */}
          {business.logo && (
            <div className="mb-4 md:mb-6">
              <img
                src={business.logo}
                alt={business.name}
                className="w-16 h-16 md:w-24 md:h-24 mx-auto rounded-xl md:rounded-2xl object-cover shadow-2xl ring-2 md:ring-4 ring-white/20"
              />
            </div>
          )}
          
          {/* Título editable */}
          <div className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 leading-tight px-2">
            <EditableText
              value={content.heroTitle}
              onChange={(val) => handleContentChange('heroTitle', val)}
              editMode={editMode}
              style={{ 
                fontFamily: template.fonts.heading,
                color: '#fff',
                textShadow: '0 4px 30px rgba(0,0,0,0.3)'
              }}
            />
          </div>
          
          {/* Subtítulo editable */}
          <div className="text-base sm:text-lg md:text-2xl mb-6 md:mb-8 max-w-2xl mx-auto px-2">
            <EditableText
              value={content.heroSubtitle}
              onChange={(val) => handleContentChange('heroSubtitle', val)}
              editMode={editMode}
              style={{ color: 'rgba(255,255,255,0.9)' }}
              multiline
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            <button
              className="flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-sm md:text-lg shadow-2xl transition hover:scale-105 w-full sm:w-auto justify-center"
              style={{ backgroundColor: colors.accent, color: '#fff' }}
            >
              <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
              <EditableText
                value={content.ctaText}
                onChange={(val) => handleContentChange('ctaText', val)}
                editMode={editMode}
              />
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            
            {business.phone && (
              <button className="flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 rounded-full font-semibold bg-white/20 backdrop-blur text-white border border-white/30 text-sm md:text-base">
                <Phone className="w-4 h-4 md:w-5 md:h-5" />
                Llamar
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ============ ABOUT SECTION ============ */}
      <section className="py-12 md:py-20 px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <span 
            className="inline-block px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold mb-4 md:mb-6"
            style={{ backgroundColor: colors.accent + '20', color: colors.accent }}
          >
            Conócenos
          </span>
          
          {/* Título About editable */}
          <div 
            className="text-2xl md:text-4xl font-bold mb-4 md:mb-6"
            style={{ fontFamily: template.fonts.heading, color: colors.primary }}
          >
            <EditableText
              value={content.aboutTitle}
              onChange={(val) => handleContentChange('aboutTitle', val)}
              editMode={editMode}
            />
          </div>
          
          {/* Texto About editable */}
          <div className="text-base md:text-lg leading-relaxed" style={{ color: colors.secondary }}>
            <EditableText
              value={content.aboutText}
              onChange={(val) => handleContentChange('aboutText', val)}
              editMode={editMode}
              multiline
            />
          </div>
        </div>
      </section>
      
      {/* ============ SERVICES/FEATURES SECTION ============ */}
      {content.services && content.services.length > 0 && (
        <section className="py-12 md:py-20 px-4 md:px-6" style={{ backgroundColor: colors.primary + '08' }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <span 
                className="inline-block px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold mb-4 md:mb-6"
                style={{ backgroundColor: colors.accent + '20', color: colors.accent }}
              >
                Beneficios
              </span>
              
              {/* Título servicios editable */}
              <div 
                className="text-2xl md:text-4xl font-bold"
                style={{ fontFamily: template.fonts.heading, color: colors.primary }}
              >
                <EditableText
                  value={content.servicesTitle || '¿Por qué elegirnos?'}
                  onChange={(val) => handleContentChange('servicesTitle', val)}
                  editMode={editMode}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {content.services.slice(0, 4).map((service, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-white shadow-md text-center"
                >
                  <div 
                    className="w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${colors.accent}20, ${colors.primary}20)` }}
                  >
                    <Star className="w-5 h-5" style={{ color: colors.accent }} />
                  </div>
                  <h3 className="text-sm font-bold mb-1 line-clamp-1" style={{ color: colors.primary }}>
                    {service.title}
                  </h3>
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: colors.secondary }}>
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ PRODUCTS SECTION ============ */}
      {products.length > 0 && (
        <section className="py-12 md:py-20 px-4 md:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-6 md:mb-12">
              <span 
                className="inline-block px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold mb-4 md:mb-6"
                style={{ backgroundColor: colors.accent + '20', color: colors.accent }}
              >
                Catálogo
              </span>
              
              <h2 
                className="text-2xl md:text-4xl font-bold"
                style={{ fontFamily: template.fonts.heading, color: colors.primary }}
              >
                Nuestros Productos
              </h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
              {products.map((product) => (
                <div 
                  key={product.id} 
                  className="bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-lg group"
                >
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <Package className="w-10 h-10 md:w-16 md:h-16 text-gray-300" />
                    )}
                    
                    {product.featured && (
                      <div 
                        className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold text-white flex items-center gap-1"
                        style={{ backgroundColor: colors.accent }}
                      >
                        <Star className="w-2.5 h-2.5 md:w-3 md:h-3 fill-current" />
                        <span className="hidden sm:inline">Destacado</span>
                        <span className="sm:hidden">★</span>
                      </div>
                    )}
                    
                    {product.originalPrice && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-bold text-white bg-red-500">
                        -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2.5 md:p-4">
                    <h3 className="font-semibold text-sm md:text-base mb-0.5 line-clamp-1 md:line-clamp-2" style={{ color: colors.primary }}>
                      {product.name}
                    </h3>
                    
                    {product.description && (
                      <p className="text-[11px] md:text-xs text-gray-500 mb-1.5 line-clamp-1 md:line-clamp-2 hidden sm:block">
                        {product.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                      <span className="font-bold text-base md:text-xl" style={{ color: colors.accent }}>
                        ${product.price.toLocaleString()}
                      </span>
                      {product.originalPrice && (
                        <span className="text-[10px] md:text-sm line-through text-gray-400">
                          ${product.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* ============ TESTIMONIALS SECTION ============ */}
      {content.testimonials && content.testimonials.length > 0 && (
        <section className="py-12 md:py-20 px-4 md:px-6" style={{ backgroundColor: colors.primary + '05' }}>
          <div className="max-w-4xl mx-auto">
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
                <div key={index} className="bg-white p-4 rounded-xl shadow-md">
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
      <section 
        className="py-12 md:py-20 px-4 md:px-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || colors.primary}dd)` }}
      >
        {/* Decorative elements - hidden on mobile */}
        <div className="hidden md:block absolute top-0 left-0 w-48 h-48 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="hidden md:block absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2" />
        
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 
            className="text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-white"
            style={{ fontFamily: template.fonts.heading }}
          >
            ¿Listo para comenzar?
          </h2>
          
          <p className="text-sm md:text-lg text-white/80 mb-6 md:mb-8 max-w-xl mx-auto px-2">
            Estamos aquí para ayudarte. Contáctanos y descubre cómo podemos hacer realidad lo que necesitas.
          </p>
          
          {/* Contact Info - Stack on mobile */}
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-4 mb-6 md:mb-8 text-xs md:text-sm">
            {business.phone && (
              <span className="flex items-center gap-2 text-white/90">
                <Phone className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {business.phone}
              </span>
            )}
            
            {business.address && (
              <span className="flex items-center gap-2 text-white/90 text-center">
                <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span className="line-clamp-1">{business.address}</span>
              </span>
            )}
            
            {business.schedule && (
              <span className="flex items-center gap-2 text-white/90">
                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {business.schedule}
              </span>
            )}
          </div>
          
          {/* Social Links */}
          <div className="flex items-center justify-center gap-3 mb-6 md:mb-8">
            {business.instagram && (
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white">
                <Instagram className="w-4 h-4 md:w-5 md:h-5" />
              </div>
            )}
            {business.facebook && (
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white">
                <Facebook className="w-4 h-4 md:w-5 md:h-5" />
              </div>
            )}
          </div>
          
          {/* Main CTA */}
          {business.whatsapp && (
            <button
              className="inline-flex items-center gap-2 md:gap-3 px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-sm md:text-lg shadow-2xl transition hover:scale-105"
              style={{ backgroundColor: '#25D366', color: '#fff' }}
            >
              <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
              Escríbenos por WhatsApp
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </section>
      
      {/* ============ FOOTER ============ */}
      <footer className="py-6 px-6 text-center" style={{ backgroundColor: colors.background }}>
        <p style={{ color: colors.secondary }}>
          © {new Date().getFullYear()} {business.name}. Todos los derechos reservados.
        </p>
        <p className="mt-2 text-sm" style={{ color: colors.secondary + '80' }}>
          Hecho con 💜 usando{' '}
          <span style={{ color: colors.accent }}>Quantum AI Web Engine</span>
        </p>
      </footer>
    </div>
  );
}
