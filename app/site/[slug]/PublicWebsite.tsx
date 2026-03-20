'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  Instagram,
  Facebook,
  Star,
  Package,
  ChevronDown,
  Heart,
  Shield,
  Zap,
  Gift,
  X,
  ArrowRight,
  Check,
  Sparkles,
  Quote
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  originalPrice?: number;
  image: string | null;
  category: string | null;
  inStock: boolean;
  featured: boolean;
}

interface AppointmentService {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  color: string;
  active: boolean;
}

interface Testimonial {
  name: string;
  text: string;
  rating: number;
  avatar?: string;
}

interface WebsiteData {
  id: number;
  slug: string;
  businessName: string;
  businessDescription: string | null;
  businessCategory: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  schedule: string | null;
  instagram: string | null;
  facebook: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  galleryImages: string[];
  templateId: string;
  templateStyle: string;
  templateColors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  templateFonts: {
    heading: string;
    body: string;
  };
  heroTitle: string | null;
  heroSubtitle: string | null;
  aboutTitle: string | null;
  aboutText: string | null;
  servicesTitle: string | null;
  services: { icon: string; title: string; description: string }[] | null;
  siteType: string;
  appointmentServices: AppointmentService[] | null;
  ctaText: string | null;
  testimonials: Testimonial[] | null;
  products: Product[];
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  star: Star,
  heart: Heart,
  clock: Clock,
  shield: Shield,
  zap: Zap,
  gift: Gift,
  check: Check,
  sparkles: Sparkles
};

// Imágenes de fondo por categoría (Unsplash)
const CATEGORY_HERO_IMAGES: Record<string, string> = {
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

export default function PublicWebsite({ website }: { website: WebsiteData }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const colors = website.templateColors;
  const fonts = website.templateFonts;
  
  // Determinar tema y estilo
  const isDarkTheme = website.templateStyle === 'energetic' || website.templateStyle === 'tech';

  // Hero image
  const heroImage = website.heroImageUrl || CATEGORY_HERO_IMAGES[website.businessCategory || 'otro'] || CATEGORY_HERO_IMAGES.otro;

  // Scroll detection para header flotante
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track clicks para analytics
  const handleWhatsAppClick = () => {
    fetch(`/api/quantum-web/track?websiteId=${website.id}&action=whatsapp`, { method: 'POST' }).catch(() => {});
  };

  const handlePhoneClick = () => {
    fetch(`/api/quantum-web/track?websiteId=${website.id}&action=phone`, { method: 'POST' }).catch(() => {});
  };

  return (
    <div 
      className="min-h-screen overflow-x-hidden"
      style={{ 
        backgroundColor: colors.background, 
        color: colors.text,
        fontFamily: fonts.body
      }}
    >
      {/* ============ FLOATING HEADER ============ */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'py-2' : 'py-4'
        }`}
        style={{
          backgroundColor: isScrolled ? colors.background + 'f5' : 'transparent',
          backdropFilter: isScrolled ? 'blur(20px)' : 'none',
          boxShadow: isScrolled ? '0 4px 30px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {website.logoUrl && (
              <img 
                src={website.logoUrl} 
                alt={website.businessName}
                className={`rounded-xl object-cover transition-all ${isScrolled ? 'w-10 h-10' : 'w-12 h-12'}`}
              />
            )}
            <span 
              className={`font-bold transition-all ${isScrolled ? 'text-lg' : 'text-xl'}`}
              style={{ 
                fontFamily: fonts.heading, 
                color: isScrolled ? colors.primary : (isDarkTheme || !isScrolled ? '#fff' : colors.primary) 
              }}
            >
              {website.businessName}
            </span>
          </div>
          
          {website.whatsapp && (
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={`https://wa.me/${website.whatsapp.replace(/\D/g, '')}?text=Hola, vi tu página y me gustaría más información sobre ${website.businessName}`}
              onClick={handleWhatsAppClick}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-white shadow-lg transition-all"
              style={{ backgroundColor: '#25D366' }}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </motion.a>
          )}
        </div>
      </motion.header>

      {/* ============ HERO SECTION ============ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
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
                : `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.7))`
            }}
          />
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center py-32">
          {/* Logo */}
          {website.logoUrl && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', duration: 0.8 }}
              className="mb-8"
            >
              <img
                src={website.logoUrl}
                alt={website.businessName}
                className="w-28 h-28 md:w-36 md:h-36 mx-auto rounded-3xl object-cover shadow-2xl ring-4 ring-white/20"
              />
            </motion.div>
          )}
          
          {/* Main Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
            style={{ 
              fontFamily: fonts.heading,
              color: '#fff',
              textShadow: '0 4px 30px rgba(0,0,0,0.3)'
            }}
          >
            {website.heroTitle || website.businessName}
          </motion.h1>
          
          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-xl md:text-2xl mb-10 max-w-2xl mx-auto leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            {website.heroSubtitle || website.businessDescription}
          </motion.p>
          
          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {website.whatsapp && (
              <motion.a
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                href={`https://wa.me/${website.whatsapp.replace(/\D/g, '')}?text=Hola, vi tu página y me gustaría más información`}
                onClick={handleWhatsAppClick}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg shadow-2xl transition-all"
                style={{ backgroundColor: colors.accent, color: '#fff' }}
              >
                <MessageSquare className="w-5 h-5" />
                {website.ctaText || '¡Contáctanos Ahora!'}
                <ArrowRight className="w-5 h-5" />
              </motion.a>
            )}
            
            {website.phone && (
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={`tel:${website.phone}`}
                onClick={handlePhoneClick}
                className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold bg-white/20 backdrop-blur text-white border border-white/30 hover:bg-white/30 transition-all"
              >
                <Phone className="w-5 h-5" />
                Llamar Ahora
              </motion.a>
            )}
          </motion.div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-8 h-12 rounded-full border-2 border-white/40 flex items-start justify-center p-2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-3 bg-white/60 rounded-full"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ============ ABOUT SECTION ============ */}
      {(website.aboutTitle || website.aboutText) && (
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <span 
                className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6"
                style={{ backgroundColor: colors.accent + '20', color: colors.accent }}
              >
                Conócenos
              </span>
              
              <h2 
                className="text-3xl md:text-5xl font-bold mb-8"
                style={{ fontFamily: fonts.heading, color: colors.primary }}
              >
                {website.aboutTitle || 'Nuestra Historia'}
              </h2>
              
              <p 
                className="text-lg md:text-xl leading-relaxed"
                style={{ color: colors.secondary }}
              >
                {website.aboutText}
              </p>
            </motion.div>
          </div>
        </section>
      )}

      {/* ============ SERVICES/FEATURES SECTION ============ */}
      {website.services && website.services.length > 0 && (
        <section 
          className="py-24 px-6"
          style={{ backgroundColor: colors.primary + '08' }}
        >
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span 
                className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6"
                style={{ backgroundColor: colors.accent + '20', color: colors.accent }}
              >
                Beneficios
              </span>
              
              <h2 
                className="text-3xl md:text-5xl font-bold"
                style={{ fontFamily: fonts.heading, color: colors.primary }}
              >
                {website.servicesTitle || '¿Por qué elegirnos?'}
              </h2>
            </motion.div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {website.services.map((service, index) => {
                const IconComponent = ICONS[service.icon] || Star;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="p-8 rounded-3xl bg-white shadow-xl hover:shadow-2xl transition-all"
                  >
                    <div 
                      className="w-16 h-16 mb-6 rounded-2xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${colors.accent}20, ${colors.primary}20)` }}
                    >
                      <IconComponent className="w-8 h-8" style={{ color: colors.accent }} />
                    </div>
                    
                    <h3 
                      className="text-xl font-bold mb-3"
                      style={{ color: colors.primary }}
                    >
                      {service.title}
                    </h3>
                    
                    <p className="leading-relaxed" style={{ color: colors.secondary }}>
                      {service.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============ PRODUCTS SECTION ============ */}
      {website.products.length > 0 && (
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span 
                className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6"
                style={{ backgroundColor: colors.accent + '20', color: colors.accent }}
              >
                Catálogo
              </span>
              
              <h2 
                className="text-3xl md:text-5xl font-bold"
                style={{ fontFamily: fonts.heading, color: colors.primary }}
              >
                Nuestros Productos
              </h2>
            </motion.div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {website.products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -8 }}
                  onClick={() => setSelectedProduct(product)}
                  className="cursor-pointer group"
                >
                  <div className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all">
                    <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        />
                      ) : (
                        <Package className="w-16 h-16 text-gray-300" />
                      )}
                      
                      {product.featured && (
                        <div 
                          className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1"
                          style={{ backgroundColor: colors.accent }}
                        >
                          <Star className="w-3 h-3 fill-current" />
                          Destacado
                        </div>
                      )}
                      
                      {product.originalPrice && (
                        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-red-500">
                          -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                        </div>
                      )}
                      
                      {!product.inStock && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">Agotado</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-5">
                      <h3 
                        className="font-semibold text-lg mb-2 line-clamp-2"
                        style={{ color: colors.primary }}
                      >
                        {product.name}
                      </h3>
                      
                      {product.description && (
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <span 
                          className="font-bold text-2xl"
                          style={{ color: colors.accent }}
                        >
                          ${product.price.toLocaleString()}
                        </span>
                        {product.originalPrice && (
                          <span className="text-sm line-through text-gray-400">
                            ${product.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ APPOINTMENT SERVICES SECTION ============ */}
      {website.siteType === 'appointments' && website.appointmentServices && website.appointmentServices.filter(s => s.active).length > 0 && (
        <section 
          className="py-24 px-6"
          style={{ backgroundColor: colors.primary + '05' }}
        >
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span 
                className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6"
                style={{ backgroundColor: colors.accent + '20', color: colors.accent }}
              >
                📅 Agenda tu cita
              </span>
              
              <h2 
                className="text-3xl md:text-5xl font-bold"
                style={{ fontFamily: fonts.heading, color: colors.primary }}
              >
                Nuestros Servicios
              </h2>
              <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
                Elige el servicio que necesitas y agenda tu cita en línea
              </p>
            </motion.div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {website.appointmentServices.filter(s => s.active).map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                >
                  {/* Color bar */}
                  <div 
                    className="h-2"
                    style={{ backgroundColor: service.color }}
                  />
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 
                        className="font-bold text-xl"
                        style={{ color: colors.primary }}
                      >
                        {service.name}
                      </h3>
                      <div className="flex gap-2">
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: colors.primary + '10', color: colors.primary }}
                        >
                          {service.duration} min
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-500 mb-4 line-clamp-2">
                      {service.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span 
                        className="font-bold text-2xl"
                        style={{ color: colors.accent }}
                      >
                        ${service.price.toLocaleString()} MXN
                      </span>
                      
                      {website.whatsapp && (
                        <motion.a
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          href={`https://wa.me/${website.whatsapp.replace(/\D/g, '')}?text=Hola, me gustaría agendar una cita para el servicio: ${service.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 rounded-full font-semibold text-white text-sm transition-all"
                          style={{ backgroundColor: '#25D366' }}
                        >
                          Agendar
                        </motion.a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ TESTIMONIALS SECTION ============ */}
      {website.testimonials && website.testimonials.length > 0 && (
        <section 
          className="py-24 px-6"
          style={{ backgroundColor: colors.primary + '05' }}
        >
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span 
                className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6"
                style={{ backgroundColor: colors.accent + '20', color: colors.accent }}
              >
                Testimonios
              </span>
              
              <h2 
                className="text-3xl md:text-5xl font-bold"
                style={{ fontFamily: fonts.heading, color: colors.primary }}
              >
                Lo que dicen nuestros clientes
              </h2>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {website.testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white p-8 rounded-3xl shadow-lg relative"
                >
                  <Quote 
                    className="absolute top-6 right-6 w-10 h-10 opacity-10"
                    style={{ color: colors.primary }}
                  />
                  
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i}
                        className={`w-5 h-5 ${i < testimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                      />
                    ))}
                  </div>
                  
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    "{testimonial.text}"
                  </p>
                  
                  <div className="flex items-center gap-3">
                    {testimonial.avatar ? (
                      <img 
                        src={testimonial.avatar} 
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: colors.accent }}
                      >
                        {testimonial.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold" style={{ color: colors.primary }}>
                        {testimonial.name}
                      </p>
                      <p className="text-sm text-gray-500">Cliente verificado</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ CONTACT/CTA SECTION ============ */}
      <section 
        className="py-24 px-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || colors.primary}dd)` }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 
              className="text-3xl md:text-5xl font-bold mb-6 text-white"
              style={{ fontFamily: fonts.heading }}
            >
              ¿Listo para comenzar?
            </h2>
            
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Estamos aquí para ayudarte. Contáctanos y descubre cómo podemos hacer realidad lo que necesitas.
            </p>
            
            {/* Contact Info */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
              {website.phone && (
                <a 
                  href={`tel:${website.phone}`}
                  onClick={handlePhoneClick}
                  className="flex items-center gap-2 text-white/90 hover:text-white transition"
                >
                  <Phone className="w-5 h-5" />
                  {website.phone}
                </a>
              )}
              
              {website.address && (
                <span className="flex items-center gap-2 text-white/90">
                  <MapPin className="w-5 h-5" />
                  {website.address}
                </span>
              )}
              
              {website.schedule && (
                <span className="flex items-center gap-2 text-white/90">
                  <Clock className="w-5 h-5" />
                  {website.schedule}
                </span>
              )}
            </div>
            
            {/* Social Links */}
            <div className="flex items-center justify-center gap-4 mb-10">
              {website.instagram && (
                <motion.a 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  href={website.instagram.startsWith('http') ? website.instagram : `https://instagram.com/${website.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-14 h-14 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition"
                >
                  <Instagram className="w-6 h-6" />
                </motion.a>
              )}
              {website.facebook && (
                <motion.a 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  href={website.facebook.startsWith('http') ? website.facebook : `https://facebook.com/${website.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-14 h-14 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition"
                >
                  <Facebook className="w-6 h-6" />
                </motion.a>
              )}
            </div>
            
            {/* Main CTA */}
            {website.whatsapp && (
              <motion.a
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                href={`https://wa.me/${website.whatsapp.replace(/\D/g, '')}?text=Hola, vi tu página y me gustaría más información`}
                onClick={handleWhatsAppClick}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-bold text-xl shadow-2xl transition-all"
                style={{ backgroundColor: '#25D366', color: '#fff' }}
              >
                <MessageSquare className="w-6 h-6" />
                Escríbenos por WhatsApp
                <ArrowRight className="w-5 h-5" />
              </motion.a>
            )}
          </motion.div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-8 px-6 text-center" style={{ backgroundColor: colors.background }}>
        <p style={{ color: colors.secondary }}>
          © {new Date().getFullYear()} {website.businessName}. Todos los derechos reservados.
        </p>
        <p className="mt-2 text-sm" style={{ color: colors.secondary + '80' }}>
          Hecho con 💜 usando{' '}
          <a 
            href="https://frutos.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:opacity-100 transition"
            style={{ color: colors.accent }}
          >
            Quantum AI Web Engine
          </a>
        </p>
      </footer>

      {/* ============ PRODUCT MODAL ============ */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-auto shadow-2xl"
            >
              <div className="relative">
                {selectedProduct.image ? (
                  <img 
                    src={selectedProduct.image} 
                    alt={selectedProduct.name}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Package className="w-24 h-24 text-gray-300" />
                  </div>
                )}
                
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                >
                  <X className="w-5 h-5" />
                </button>
                
                {selectedProduct.featured && (
                  <div 
                    className="absolute top-4 left-4 px-4 py-2 rounded-full text-sm font-bold text-white flex items-center gap-1"
                    style={{ backgroundColor: colors.accent }}
                  >
                    <Star className="w-4 h-4 fill-current" />
                    Destacado
                  </div>
                )}
              </div>
              
              <div className="p-8">
                <h3 
                  className="text-2xl font-bold mb-3"
                  style={{ color: colors.primary }}
                >
                  {selectedProduct.name}
                </h3>
                
                {selectedProduct.description && (
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                )}
                
                <div className="flex items-center gap-3 mb-8">
                  <span 
                    className="text-3xl font-bold"
                    style={{ color: colors.accent }}
                  >
                    ${selectedProduct.price.toLocaleString()}
                  </span>
                  {selectedProduct.originalPrice && (
                    <>
                      <span className="text-xl line-through text-gray-400">
                        ${selectedProduct.originalPrice.toLocaleString()}
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm font-bold text-white bg-red-500">
                        -{Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}%
                      </span>
                    </>
                  )}
                </div>
                
                {website.whatsapp && selectedProduct.inStock ? (
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href={`https://wa.me/${website.whatsapp.replace(/\D/g, '')}?text=Hola, me interesa el producto: *${selectedProduct.name}* ($${selectedProduct.price.toLocaleString()})`}
                    onClick={handleWhatsAppClick}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition"
                    style={{ backgroundColor: '#25D366', color: '#fff' }}
                  >
                    <MessageSquare className="w-5 h-5" />
                    Comprar por WhatsApp
                  </motion.a>
                ) : !selectedProduct.inStock ? (
                  <div className="w-full py-4 rounded-2xl font-bold text-lg text-center bg-gray-200 text-gray-500">
                    Producto Agotado
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
