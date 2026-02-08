'use client';

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Lightbulb,
  Building2,
  Sparkles,
  Zap,
  Crown,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  RefreshCw,
  Wand2,
  Image as ImageIcon,
  Type,
  Palette,
  Target,
  Users,
  DollarSign,
  Star,
  Send,
  Save,
  Eye,
  PartyPopper,
  Volume2,
  Gift,
  Phone,
  Globe,
  MapPin,
  Camera,
  X,
  Plus,
  Tag,
  Clock,
  Lock,
  QrCode,
  Share2,
  Copy,
  ExternalLink,
  MessageSquare,
  ThumbsUp,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';

// ============================================
// TIPOS
// ============================================
interface BusinessIdea {
  nombre: string;
  slogan: string;
  descripcion: string;
  audiencia: string;
}

interface GeneratedLogo {
  id: string;
  url: string;
  selected: boolean;
}

interface GeneratedName {
  nombre: string;
  selected: boolean;
}

// ============================================
// ESTADOS DEL WIZARD
// ============================================
type WizardStep = 
  | 'selector'        // Pantalla inicial
  | 'adn-talento'     // Paso 1: Extracción de talento
  | 'ideas-negocio'   // Resultado de IA con ideas
  | 'identidad-visual'// Paso 2: Nombres y logos
  | 'pitch-oferta'    // Paso 3: Descripción y oferta
  | 'momento-verdad'  // Cierre: Publicar o guardar
  | 'optimizador';    // Para los que ya tienen negocio

// ============================================
// CATEGORÍAS DE NEGOCIO
// ============================================
const BUSINESS_CATEGORIES = [
  { value: 'servicios-profesionales', label: '💼 Servicios Profesionales', icon: '💼' },
  { value: 'salud-bienestar', label: '🧘 Salud y Bienestar', icon: '🧘' },
  { value: 'educacion-coaching', label: '📚 Educación y Coaching', icon: '📚' },
  { value: 'tecnologia', label: '💻 Tecnología', icon: '💻' },
  { value: 'arte-creatividad', label: '🎨 Arte y Creatividad', icon: '🎨' },
  { value: 'gastronomia', label: '🍽️ Gastronomía', icon: '🍽️' },
  { value: 'belleza-estetica', label: '💅 Belleza y Estética', icon: '💅' },
  { value: 'hogar-servicios', label: '🏠 Hogar y Servicios', icon: '🏠' },
  { value: 'fitness-deportes', label: '🏋️ Fitness y Deportes', icon: '🏋️' },
  { value: 'mascotas', label: '🐾 Mascotas', icon: '🐾' },
  { value: 'eventos', label: '🎉 Eventos y Entretenimiento', icon: '🎉' },
  { value: 'moda-accesorios', label: '👗 Moda y Accesorios', icon: '👗' },
  { value: 'automotriz', label: '🚗 Automotriz', icon: '🚗' },
  { value: 'construccion', label: '🔨 Construcción y Remodelación', icon: '🔨' },
  { value: 'finanzas', label: '💰 Finanzas y Seguros', icon: '💰' },
  { value: 'otro', label: '✨ Otro', icon: '✨' },
];

// ============================================
// FRASES DE CARGA MOTIVANTES
// ============================================
const LOADING_PHRASES = [
  "Calibrando frecuencias de abundancia...",
  "Conectando con la fuente creativa...",
  "Diseñando tu futuro...",
  "Materializando posibilidades infinitas...",
  "Alineando tu energía con la prosperidad...",
  "Decodificando tu potencial único...",
  "Canalizando ideas del campo cuántico...",
  "Sincronizando con el universo de los negocios...",
];

// ============================================
// COMPONENTE: Compartir en la Expo
// ============================================
function ExpoShareSection({ userId, userName, visionId }: { userId?: number; userName?: string; visionId?: number }) {
  const [expoQR, setExpoQR] = useState<string | null>(null);
  const [expoLink, setExpoLink] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);

  useEffect(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    if (userId) {
      // Link directo para votar por este usuario/negocio
      const link = `${baseUrl}/expo/votar/${userId}`;
      setExpoLink(link);
      generateQR(link);
    }
  }, [userId, visionId]);

  const generateQR = async (url: string) => {
    setGeneratingQR(true);
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setExpoQR(qrDataUrl);
    } catch (error) {
      console.error('Error generando QR:', error);
    } finally {
      setGeneratingQR(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(expoLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copiando:', error);
    }
  };

  const shareLink = async () => {
    // Crear mensaje de invitación para WhatsApp - tono personal
    const mensaje = `Hola! Sé que tal vez ya tienes planes, pero no quiero dejar pasar la oportunidad de invitarte a mi presentación en la Expo de Futuros Imposibles.

Vamos a tener la presentación de varios compañeros emprendedores y nuestros negocios innovadores.

Puedes pre-registrarte y calificar a tus favoritos desde este link:

${expoLink}

Espero verte ahí!`;

    // Abrir WhatsApp con el mensaje
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Función para imprimir QR en hoja tamaño carta
  const printQR = async () => {
    // Generar QR más grande para impresión
    const printQRDataUrl = await QRCode.toDataURL(expoLink, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const businessName = userName || 'Mi Negocio';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR - ${businessName}</title>
        <style>
          @page {
            size: letter;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            width: 8.5in;
            height: 11in;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            padding: 0.5in;
          }
          .container {
            text-align: center;
            width: 100%;
            max-width: 6in;
          }
          .header {
            margin-bottom: 0.3in;
          }
          .expo-title {
            font-size: 24pt;
            font-weight: 800;
            color: #f97316;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 0.1in;
          }
          .subtitle {
            font-size: 14pt;
            color: #64748b;
            font-weight: 500;
          }
          .business-name {
            font-size: 36pt;
            font-weight: 800;
            color: #1e293b;
            margin: 0.4in 0;
            line-height: 1.2;
          }
          .qr-container {
            background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
            border: 4px solid #f97316;
            border-radius: 24px;
            padding: 0.4in;
            display: inline-block;
            margin: 0.3in 0;
            box-shadow: 0 8px 30px rgba(249, 115, 22, 0.2);
          }
          .qr-image {
            width: 3.5in;
            height: 3.5in;
          }
          .scan-text {
            font-size: 20pt;
            font-weight: 700;
            color: #ea580c;
            margin-top: 0.3in;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .scan-icon {
            font-size: 24pt;
          }
          .instructions {
            font-size: 13pt;
            color: #64748b;
            margin-top: 0.2in;
            line-height: 1.5;
          }
          .footer {
            margin-top: 0.4in;
            padding-top: 0.2in;
            border-top: 2px dashed #e2e8f0;
          }
          .url-text {
            font-size: 10pt;
            color: #94a3b8;
            font-family: monospace;
            word-break: break-all;
          }
          .decorative-stars {
            font-size: 18pt;
            color: #fbbf24;
            margin: 0.15in 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="expo-title">🚀 Expo de Futuros Imposibles</div>
            <div class="subtitle">¡Califica este negocio!</div>
          </div>
          
          <div class="decorative-stars">⭐ ⭐ ⭐ ⭐ ⭐</div>
          
          <div class="business-name">${businessName}</div>
          
          <div class="qr-container">
            <img src="${printQRDataUrl}" alt="QR Code" class="qr-image" />
          </div>
          
          <div class="scan-text">
            <span class="scan-icon">📱</span>
            Escanea y vota
          </div>
          
          <div class="instructions">
            Abre la cámara de tu celular<br/>
            y escanea el código QR para calificar
          </div>
          
          <div class="footer">
            <div class="url-text">${expoLink}</div>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  if (!userId && !visionId) return null;

  return (
    <div className="bg-gradient-to-r from-orange-900/30 to-amber-900/30 rounded-2xl p-6 border border-orange-500/30">
      <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
        <QrCode className="w-5 h-5 text-orange-400" />
        Compartir en la Expo
      </h3>
      <p className="text-slate-400 text-sm mb-4">
        Comparte este link o QR para que los invitados vean el catálogo y califiquen tu negocio
      </p>

      <div className="flex flex-col md:flex-row gap-4">
        {/* QR Code */}
        <div className="flex-shrink-0">
          {generatingQR ? (
            <div className="w-32 h-32 bg-slate-800 rounded-xl flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            </div>
          ) : expoQR ? (
            <div className="bg-white p-2 rounded-xl">
              <img src={expoQR} alt="QR Expo" className="w-28 h-28" />
            </div>
          ) : null}
        </div>

        {/* Link y botones */}
        <div className="flex-1 space-y-3">
          {/* Link */}
          <div className="flex gap-2">
            <input
              type="text"
              value={expoLink}
              readOnly
              className="flex-1 p-2 rounded-lg bg-slate-800/50 border border-slate-600/50 text-white text-sm truncate"
            />
            <button
              onClick={copyLink}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1 ${
                copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Botones */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={shareLink}
              className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-green-500/25 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Invitar a Expo
            </button>
            <button
              onClick={printQR}
              className="py-2 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm flex items-center gap-2 transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </button>
            <a
              href={expoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm flex items-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Probar
            </a>
          </div>

          <p className="text-xs text-slate-500">
            💡 Los invitados verán el catálogo de expositores y podrán pre-registrarse
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: Calificaciones de la Expo
// ============================================
interface ExpoReview {
  id: string;
  ratingStars: number;
  hiringIntent: 'YES' | 'MAYBE' | 'NO';
  feedbackText: string | null;
  visitorName: string;
  visitorPhone: string;
  visitorEmail: string;
  createdAt: string;
}

interface ExpoStats {
  totalReviews: number;
  avgRating: number;
  hiringIntentCounts: {
    YES: number;
    MAYBE: number;
    NO: number;
  };
  hotLeadsCount: number;
  warmLeadsCount: number;
}

function ExpoReviewsSection({ userId }: { userId?: number }) {
  const [reviews, setReviews] = useState<ExpoReview[]>([]);
  const [stats, setStats] = useState<ExpoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showLeads, setShowLeads] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchReviews();
    }
  }, [userId]);

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/expo/my-reviews');
      const data = await res.json();
      
      if (data.success) {
        setReviews(data.reviews);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) return null;

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-2xl p-6 border border-blue-500/30">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!stats || stats.totalReviews === 0) {
    return (
      <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-2xl p-6 border border-blue-500/30">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" />
          Calificaciones de la Expo
        </h3>
        <p className="text-slate-400 text-sm">
          Aún no tienes calificaciones. ¡Comparte tu QR en la Expo para recibir votos!
        </p>
      </div>
    );
  }

  const hiringIntentLabels = {
    YES: { label: '¡Sí, contrataría!', color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: '🔥' },
    MAYBE: { label: 'Tal vez', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: '🤔' },
    NO: { label: 'No por ahora', color: 'text-slate-400', bg: 'bg-slate-500/20', icon: '❄️' }
  };

  return (
    <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-2xl p-6 border border-blue-500/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" />
          Calificaciones de la Expo
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
        >
          {expanded ? 'Ver menos' : 'Ver detalles'}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">{stats.totalReviews}</div>
          <div className="text-xs text-slate-400">Votos totales</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400 flex items-center justify-center gap-1">
            {stats.avgRating} <Star className="w-4 h-4 fill-yellow-400" />
          </div>
          <div className="text-xs text-slate-400">Promedio</div>
        </div>
        <div className="bg-emerald-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.hotLeadsCount} 🔥</div>
          <div className="text-xs text-emerald-300">Hot Leads</div>
        </div>
        <div className="bg-yellow-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.warmLeadsCount} 🤔</div>
          <div className="text-xs text-yellow-300">Warm Leads</div>
        </div>
      </div>

      {/* Intención de contratación */}
      <div className="mb-4">
        <div className="text-sm text-slate-400 mb-2">Intención de contratación</div>
        <div className="flex gap-2">
          {Object.entries(stats.hiringIntentCounts).map(([key, count]) => {
            const intent = hiringIntentLabels[key as keyof typeof hiringIntentLabels];
            const percentage = stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;
            return (
              <div key={key} className={`flex-1 ${intent.bg} rounded-lg p-2 text-center`}>
                <div className="text-lg font-bold ${intent.color}">{intent.icon} {count}</div>
                <div className="text-xs text-slate-400">{percentage}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalles expandidos */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Toggle para ver leads */}
            {(stats.hotLeadsCount > 0 || stats.warmLeadsCount > 0) && (
              <button
                onClick={() => setShowLeads(!showLeads)}
                className="w-full mb-3 py-2 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white font-medium text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <ThumbsUp className="w-4 h-4" />
                {showLeads ? 'Ocultar contactos interesados' : `Ver ${stats.hotLeadsCount + stats.warmLeadsCount} contactos interesados`}
              </button>
            )}

            {/* Lista de leads */}
            {showLeads && (
              <div className="space-y-2 mb-4">
                <div className="text-sm text-slate-400 mb-2">Personas interesadas en tu servicio:</div>
                {reviews
                  .filter(r => r.hiringIntent === 'YES' || r.hiringIntent === 'MAYBE')
                  .map((review) => (
                    <div key={review.id} className="bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-white flex items-center gap-2">
                            {review.visitorName}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              review.hiringIntent === 'YES' 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {review.hiringIntent === 'YES' ? '🔥 Hot Lead' : '🤔 Interesado'}
                            </span>
                          </div>
                          <div className="text-sm text-slate-400 flex flex-wrap items-center gap-3 mt-1">
                            {review.visitorPhone && review.visitorPhone !== 'N/A' ? (
                              <a href={`tel:${review.visitorPhone}`} className="hover:text-green-400 flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded">
                                <Phone className="w-3 h-3" /> {review.visitorPhone}
                              </a>
                            ) : (
                              <span className="text-slate-500 flex items-center gap-1 text-xs">
                                <Phone className="w-3 h-3" /> Sin teléfono registrado
                              </span>
                            )}
                            {review.visitorEmail && review.visitorEmail !== 'anonimo@expo.com' ? (
                              <a href={`mailto:${review.visitorEmail}`} className="hover:text-blue-400 flex items-center gap-1">
                                📧 {review.visitorEmail}
                              </a>
                            ) : null}
                          </div>
                          {review.feedbackText && (
                            <div className="mt-2 text-sm text-slate-300 bg-slate-700/50 rounded p-2">
                              <MessageSquare className="w-3 h-3 inline mr-1" />
                              "{review.feedbackText}"
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < review.ratingStars ? 'fill-yellow-400' : 'fill-slate-600'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Últimas calificaciones */}
            <div className="text-sm text-slate-400 mb-2">Últimas calificaciones:</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="bg-slate-800/30 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-white flex items-center gap-2">
                        {review.visitorName}
                        {(review.hiringIntent === 'YES' || review.hiringIntent === 'MAYBE') && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            review.hiringIntent === 'YES' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {review.hiringIntent === 'YES' ? '🔥' : '🤔'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(review.createdAt).toLocaleDateString('es-MX', { 
                          day: 'numeric', 
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {/* Mostrar teléfono si está disponible */}
                      {review.visitorPhone && review.visitorPhone !== 'N/A' && (
                        <a href={`tel:${review.visitorPhone}`} className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" /> {review.visitorPhone}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${hiringIntentLabels[review.hiringIntent].bg} ${hiringIntentLabels[review.hiringIntent].color}`}>
                        {hiringIntentLabels[review.hiringIntent].icon}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < review.ratingStars ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function QuantumBusinessBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Refs para los textareas (evitar re-renders)
  const talentoRef = useRef<HTMLTextAreaElement>(null);
  const audienciaRef = useRef<HTMLTextAreaElement>(null);
  
  // Refs para el optimizador
  const optimizadorNombreRef = useRef<HTMLInputElement>(null);
  const optimizadorDescripcionRef = useRef<HTMLTextAreaElement>(null);
  const optimizadorOfertaRef = useRef<HTMLInputElement>(null);
  
  // Verificación de acceso PL
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  
  // Estado del wizard
  const [step, setStep] = useState<WizardStep>('selector');
  const [loading, setLoading] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);
  
  // Notificación personalizada (reemplazo de alert nativo)
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);
  
  // Función para mostrar notificación
  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string, duration = 4000) => {
    setNotification({ show: true, type, title, message });
    setTimeout(() => {
      setNotification(null);
    }, duration);
  };
  
  // Datos del ADN (Paso 1) - solo para mantener el valor entre pasos
  const [talento, setTalento] = useState('');
  const [audiencia, setAudiencia] = useState('');
  
  // Ideas generadas
  const [ideas, setIdeas] = useState<BusinessIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<BusinessIdea | null>(null);
  
  // Identidad Visual (Paso 2)
  const [generatedNames, setGeneratedNames] = useState<GeneratedName[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [customName, setCustomName] = useState('');
  const [generatedLogos, setGeneratedLogos] = useState<GeneratedLogo[]>([]);
  const [selectedLogo, setSelectedLogo] = useState('');
  const [selectedLogoIndex, setSelectedLogoIndex] = useState<number | null>(null);
  const [uploadingSelectedLogo, setUploadingSelectedLogo] = useState(false);
  const [heroImage, setHeroImage] = useState('');
  
  // Pitch (Paso 3)
  const [descripcion, setDescripcion] = useState('');
  const [ofertaTribu, setOfertaTribu] = useState('');
  
  // Preview del optimizador (para actualizar en tiempo real)
  const [previewNombre, setPreviewNombre] = useState('');
  const [previewDescripcion, setPreviewDescripcion] = useState('');
  const [previewOferta, setPreviewOferta] = useState('');
  
  // Nuevos campos del negocio
  const [previewCategoria, setPreviewCategoria] = useState('');
  const [previewTelefono, setPreviewTelefono] = useState('');
  const [previewWhatsapp, setPreviewWhatsapp] = useState('');
  const [previewWebsite, setPreviewWebsite] = useState('');
  const [previewFotos, setPreviewFotos] = useState<string[]>([]);
  const [previewDireccion, setPreviewDireccion] = useState('');
  const [previewLatitud, setPreviewLatitud] = useState<number | null>(null);
  const [previewLongitud, setPreviewLongitud] = useState<number | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  
  // Modal de mapa para seleccionar ubicación
  const [showMapModal, setShowMapModal] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<{display_name: string; lat: string; lon: string}[]>([]);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  
  // Logo del negocio
  const [previewLogo, setPreviewLogo] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [generatingLogo, setGeneratingLogo] = useState(false);
  
  // Modal de selección de logos IA
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [logoOptions, setLogoOptions] = useState<{url: string; selected: boolean}[]>([]);
  
  // Horario del negocio
  const [previewHorario, setPreviewHorario] = useState('');
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
  
  // Switch Razonable/Irrazonable (público en directorio)
  const [esIrrazonable, setEsIrrazonable] = useState(false);
  
  // Datos existentes (para optimizador)
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  
  // Sitio web existente de Quantum
  const [existingWebsite, setExistingWebsite] = useState<any>(null);
  const [hasExistingWebsite, setHasExistingWebsite] = useState(false);
  const [checkingWebsite, setCheckingWebsite] = useState(true);
  
  // Efecto para rotar frases de carga
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingPhrase(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [loading]);
  
  // Inicializar preview cuando se carga el perfil existente
  useEffect(() => {
    if (existingProfile && step === 'optimizador') {
      setPreviewNombre(existingProfile.headline || '');
      setPreviewDescripcion(existingProfile.description || '');
      setPreviewOferta(existingProfile.discountOffer || '');
      // Mapear categoryId a slug de categoría
      if (existingProfile.category?.name) {
        const cat = BUSINESS_CATEGORIES.find(c => c.label.includes(existingProfile.category.name));
        setPreviewCategoria(cat?.value || '');
      }
      setPreviewTelefono(existingProfile.whatsappPhone || '');
      setPreviewWhatsapp(existingProfile.whatsappPhone || '');
      setPreviewFotos(existingProfile.galleryImages || []);
      setPreviewLogo(existingProfile.logoUrl || '');
      // Construir dirección desde city/state/coverageZone
      const direccion = existingProfile.coverageZone || 
        [existingProfile.city, existingProfile.state].filter(Boolean).join(', ');
      setPreviewDireccion(direccion);
      // Cargar estado de visibilidad (ACTIVE = irrazonable/público)
      setEsIrrazonable(existingProfile.status === 'ACTIVE');
      
      // Coordenadas del centro de Guadalajara como default si no hay dirección específica
      if (!previewLatitud && !previewLongitud) {
        setPreviewLatitud(20.6597);
        setPreviewLongitud(-103.3496);
      }
    }
  }, [existingProfile, step]);
  
  // Cargar datos del quantum-web (URL, horarios, etc)
  // PRIORIDAD: Si hay existingWebsite, precargar TODOS los datos del sitio web
  useEffect(() => {
    if (existingWebsite?.site && step === 'optimizador') {
      const site = existingWebsite.site;
      
      // Cargar la URL de la página web publicada
      if (site.slug && site.isPublished) {
        setPreviewWebsite(`https://quantummatter.app/site/${site.slug}`);
      }
      
      // Precargar TODOS los datos del sitio web si no hay existingProfile
      // o si existingProfile no tiene esos datos
      if (!existingProfile || !existingProfile.headline) {
        // Nombre del negocio
        if (site.businessName) {
          setPreviewNombre(site.businessName);
        }
        // Descripción
        if (site.businessDescription) {
          setPreviewDescripcion(site.businessDescription);
        }
        // Categoría
        if (site.businessCategory) {
          const cat = BUSINESS_CATEGORIES.find(c => c.value === site.businessCategory);
          if (cat) {
            setPreviewCategoria(cat.value);
          }
        }
        // Logo
        if (site.logoUrl) {
          setPreviewLogo(site.logoUrl);
        }
        // Galería
        if (site.galleryImages?.length > 0) {
          setPreviewFotos(site.galleryImages);
        }
      }
      
      // Estos campos siempre se cargan del quantum-web si existen
      // Teléfono
      if (site.phone && !previewTelefono) {
        setPreviewTelefono(site.phone);
      }
      // WhatsApp
      if (site.whatsapp && !previewWhatsapp) {
        setPreviewWhatsapp(site.whatsapp);
      }
      // Horarios
      if (site.schedule) {
        setPreviewHorario(site.schedule);
      }
      // Dirección
      if (site.address && !previewDireccion) {
        setPreviewDireccion(site.address);
      }
    }
  }, [existingWebsite, existingProfile, step]);

  // Verificar acceso (Avanzado completado o PL)
  useEffect(() => {
    const checkLideratoAccess = async () => {
      try {
        const response = await fetch('/api/liderato-access');
        if (response.ok) {
          const data = await response.json();
          setHasAccess(data.hasAccess === true);
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error checking Liderato access:', error);
        setHasAccess(false);
      }
    };
    checkLideratoAccess();
  }, []);

  // Verificar si ya tiene perfil al cargar
  useEffect(() => {
    if (hasAccess === true) {
      checkExistingProfile();
      checkExistingWebsite();
    } else if (hasAccess === false) {
      // Si no tiene acceso, no necesitamos verificar el website
      setCheckingWebsite(false);
    }
  }, [hasAccess]);

  // Si viene con ?view=optimizador, ir directo al optimizador cuando tenga perfil
  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'optimizador' && hasExistingProfile && hasAccess === true) {
      setStep('optimizador');
    }
  }, [searchParams, hasExistingProfile, hasAccess]);

  const checkExistingProfile = async () => {
    try {
      const res = await fetch('/api/talent-directory/my-profile');
      if (res.ok) {
        const data = await res.json();
        setHasExistingProfile(data.hasProfile);
        if (data.profile) {
          setExistingProfile(data.profile);
        }
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    }
  };

  // Verificar si ya tiene sitio web de Quantum publicado
  const checkExistingWebsite = async () => {
    setCheckingWebsite(true);
    try {
      const res = await fetch('/api/quantum-web/my-site');
      if (res.ok) {
        const data = await res.json();
        setHasExistingWebsite(data.hasSite);
        if (data.site) {
          setExistingWebsite(data);
        }
      }
    } catch (error) {
      console.error('Error checking website:', error);
    } finally {
      setCheckingWebsite(false);
    }
  };

  // ============================================
  // FUNCIONES DE IA
  // ============================================
  
  const generateBusinessIdeas = async () => {
    // Obtener valores de los refs
    const talentoValue = talentoRef.current?.value || talento;
    const audienciaValue = audienciaRef.current?.value || audiencia;
    
    if (!talentoValue.trim() || !audienciaValue.trim()) {
      alert('Por favor completa ambos campos');
      return;
    }
    
    // Guardar en estado para uso posterior
    setTalento(talentoValue);
    setAudiencia(audienciaValue);
    
    setLoading(true);
    try {
      const res = await fetch('/api/quantum-business/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ talento: talentoValue, audiencia: audienciaValue })
      });
      
      if (res.ok) {
        const data = await res.json();
        setIdeas(data.ideas || []);
        setStep('ideas-negocio');
      } else {
        alert('Error al generar ideas. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const generateVisualIdentity = async () => {
    if (!selectedIdea) return;
    
    setLoading(true);
    try {
      // Generar nombres
      const namesRes = await fetch('/api/quantum-business/generate-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          concepto: selectedIdea.nombre,
          descripcion: selectedIdea.descripcion 
        })
      });
      
      if (namesRes.ok) {
        const namesData = await namesRes.json();
        setGeneratedNames(namesData.nombres.map((n: string) => ({ nombre: n, selected: false })));
      }
      
      // Generar logos (simulado por ahora - integrar DALL-E después)
      const logosRes = await fetch('/api/quantum-business/generate-logos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          concepto: selectedIdea.nombre,
          descripcion: selectedIdea.descripcion 
        })
      });
      
      if (logosRes.ok) {
        const logosData = await logosRes.json();
        setGeneratedLogos(logosData.logos || []);
      }
      
      setStep('identidad-visual');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar identidad visual');
    } finally {
      setLoading(false);
    }
  };

  const generatePitch = async () => {
    const nombreFinal = customName || selectedName || selectedIdea?.nombre || '';
    if (!nombreFinal) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/quantum-business/generate-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: nombreFinal,
          concepto: selectedIdea?.descripcion,
          audiencia: selectedIdea?.audiencia || audiencia
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setDescripcion(data.descripcion || '');
        setOfertaTribu(data.oferta || '15% de descuento para miembros de la comunidad');
      }
      
      setStep('pitch-oferta');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const improveDescription = async () => {
    // Usar previewDescripcion si estamos en el optimizador, sino usar descripcion
    const textoActual = step === 'optimizador' ? previewDescripcion : descripcion;
    
    if (!textoActual.trim()) {
      alert('Escribe una descripción primero para mejorarla con IA');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/quantum-business/improve-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: textoActual })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Actualizar el estado correcto según el contexto
        if (step === 'optimizador') {
          setPreviewDescripcion(data.mejorado || textoActual);
        } else {
          setDescripcion(data.mejorado || textoActual);
        }
      } else {
        alert('Error al mejorar la descripción. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FUNCIONES PARA FOTOS Y UBICACIÓN
  // ============================================
  
  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (previewFotos.length >= 5) {
      alert('Máximo 5 fotos permitidas');
      return;
    }
    
    setUploadingFoto(true);
    
    try {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        setPreviewFotos(prev => [...prev, data.url].slice(0, 5));
      } else {
        alert('Error al subir la imagen');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    } finally {
      setUploadingFoto(false);
      e.target.value = '';
    }
  };
  
  const removeFoto = (index: number) => {
    setPreviewFotos(prev => prev.filter((_, i) => i !== index));
  };
  
  // Funciones para el logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingLogo(true);
    
    try {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        setPreviewLogo(data.url);
      } else {
        alert('Error al subir el logo');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };
  
  const generateLogoWithAI = async () => {
    if (!previewNombre.trim()) {
      alert('Primero escribe el nombre de tu negocio');
      return;
    }
    
    setGeneratingLogo(true);
    
    try {
      const res = await fetch('/api/quantum-business/generate-logos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          concepto: previewNombre,
          descripcion: previewDescripcion || previewCategoria
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.logos && data.logos.length > 0) {
          // Abrir modal con las opciones de logo
          setLogoOptions(data.logos.map((logo: any) => ({ url: logo.url, selected: false })));
          setShowLogoModal(true);
        } else {
          alert('No se generaron logos. Intenta de nuevo.');
        }
      } else {
        alert('Error al generar el logo. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    } finally {
      setGeneratingLogo(false);
    }
  };
  
  // Seleccionar un logo del modal y subirlo a Supabase para que sea permanente
  const selectLogoFromModal = async (url: string) => {
    setGeneratingLogo(true); // Mostrar loading mientras sube
    
    try {
      // Subir la imagen de DALL-E a Supabase Storage para que sea permanente
      const response = await fetch('/api/quantum-business/upload-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          logoUrl: url,
          businessName: previewNombre || 'mi-negocio'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreviewLogo(data.permanentUrl); // URL permanente de Supabase
      } else {
        // Si falla el upload, usar la URL temporal (expirará)
        console.warn('No se pudo subir a Supabase, usando URL temporal');
        setPreviewLogo(url);
      }
    } catch (error) {
      console.error('Error subiendo logo:', error);
      setPreviewLogo(url); // Fallback a URL temporal
    } finally {
      setGeneratingLogo(false);
      setShowLogoModal(false);
      setLogoOptions([]);
    }
  };
  
  // Seleccionar un logo del wizard de Idea Millonaria y subirlo a Supabase
  const handleSelectWizardLogo = async (logoUrl: string, index: number) => {
    // Marcar como seleccionado inmediatamente (visualmente)
    setSelectedLogoIndex(index);
    setSelectedLogo(logoUrl);
    setUploadingSelectedLogo(true);
    
    try {
      // Subir la imagen de DALL-E a Supabase Storage para que sea permanente
      const response = await fetch('/api/quantum-business/upload-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          logoUrl: logoUrl,
          businessName: selectedName || customName || selectedIdea?.nombre || 'idea-millonaria'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Actualizar con la URL permanente
        setSelectedLogo(data.permanentUrl);
        console.log('✅ Logo subido a Supabase:', data.permanentUrl);
      } else {
        console.warn('⚠️ No se pudo subir a Supabase, usando URL temporal');
        // Mantener la URL temporal
      }
    } catch (error) {
      console.error('Error subiendo logo:', error);
      // Mantener la URL temporal como fallback
    } finally {
      setUploadingSelectedLogo(false);
    }
  };
  
  // Regenerar logos en el modal
  const regenerateLogosInModal = async () => {
    setGeneratingLogo(true);
    try {
      const res = await fetch('/api/quantum-business/generate-logos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          concepto: previewNombre,
          descripcion: previewDescripcion || previewCategoria
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.logos && data.logos.length > 0) {
          setLogoOptions(data.logos.map((logo: any) => ({ url: logo.url, selected: false })));
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setGeneratingLogo(false);
    }
  };
  
  const removeLogo = () => {
    setPreviewLogo('');
  };
  
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setPreviewLatitud(latitude);
        setPreviewLongitud(longitude);
        
        // Obtener dirección con reverse geocoding
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          if (res.ok) {
            const data = await res.json();
            setPreviewDireccion(data.display_name || `${latitude}, ${longitude}`);
          }
        } catch (error) {
          setPreviewDireccion(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('No se pudo obtener tu ubicación. Por favor, ingresa la dirección manualmente.');
      },
      { enableHighAccuracy: true }
    );
  };

  // Buscar direcciones por texto
  const searchAddresses = async (query: string) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    
    setSearchingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      if (res.ok) {
        const data = await res.json();
        setAddressSuggestions(data);
      }
    } catch (error) {
      console.error('Error buscando direcciones:', error);
    } finally {
      setSearchingAddress(false);
    }
  };

  // Seleccionar una dirección de las sugerencias
  const selectAddress = (suggestion: {display_name: string; lat: string; lon: string}) => {
    setPreviewDireccion(suggestion.display_name);
    setPreviewLatitud(parseFloat(suggestion.lat));
    setPreviewLongitud(parseFloat(suggestion.lon));
    setAddressSuggestions([]);
    setMapSearchQuery('');
    setShowMapModal(false);
  };

  // Debounce para búsqueda de direcciones
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapSearchQuery) {
        searchAddresses(mapSearchQuery);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [mapSearchQuery]);

  // ============================================
  // FUNCIONES DE GUARDADO
  // ============================================
  
  const saveProfile = async (publish: boolean) => {
    setLoading(true);
    try {
      // Detectar si viene del wizard o del optimizador
      const isFromOptimizador = step === 'optimizador';
      
      const nombreFinal = isFromOptimizador 
        ? previewNombre 
        : (customName || selectedName || selectedIdea?.nombre || '');
      
      // Mapear categoría string a categoryId si existe
      const categoryIndex = BUSINESS_CATEGORIES.findIndex(c => c.value === previewCategoria);
      
      // Determinar status basado en el switch Irrazonable y si es publicar
      // Si es irrazonable Y se publica -> ACTIVE (público en directorio)
      // Si es razonable O es borrador -> HIDDEN (privado, solo actividad)
      const finalStatus = isFromOptimizador 
        ? (esIrrazonable ? 'ACTIVE' : 'HIDDEN')
        : (publish ? 'ACTIVE' : 'HIDDEN');
      
      const profileData = {
        headline: nombreFinal,
        description: isFromOptimizador ? previewDescripcion : descripcion,
        discountOffer: isFromOptimizador ? previewOferta : ofertaTribu,
        logoUrl: isFromOptimizador ? (previewLogo || undefined) : (selectedLogo || undefined),
        // Mapear a campos de la API
        categorySlug: previewCategoria, // String de categoría
        categoryId: categoryIndex > 0 ? categoryIndex : undefined,
        whatsappPhone: previewWhatsapp || previewTelefono,
        website: previewWebsite,
        galleryImages: previewFotos,
        // Ubicación - extraer ciudad y estado de la dirección
        city: previewDireccion ? previewDireccion.split(',')[0]?.trim() || 'Sin especificar' : 'Sin especificar',
        state: previewDireccion ? previewDireccion.split(',').slice(-2, -1)[0]?.trim() || 'Sin especificar' : 'Sin especificar',
        coverageZone: previewDireccion,
        // Metadata - ACTIVE = público en directorio, HIDDEN = solo actividad privada
        status: finalStatus,
        isPublicInDirectory: esIrrazonable // Flag adicional para claridad
      };
      
      const res = await fetch('/api/talent-directory/my-profile', {
        method: hasExistingProfile ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      
      if (res.ok) {
        if (isFromOptimizador && esIrrazonable) {
          // Celebración si es irrazonable (público)
          triggerCelebration();
          setTimeout(() => {
            router.push('/dashboard/mercado');
          }, 3000);
        } else if (publish && !isFromOptimizador) {
          // Celebración desde el wizard
          triggerCelebration();
          setTimeout(() => {
            router.push('/dashboard/mercado');
          }, 3000);
        } else {
          // Guardado sin publicar en directorio
          if (esIrrazonable) {
            showNotification('success', '🚀 ¡Publicado!', 'Tu perfil está visible en el Directorio de Negocios');
          } else {
            showNotification('info', '💾 Guardado', 'Tu perfil es privado (solo para la actividad)');
          }
          setTimeout(() => {
            router.push('/dashboard/mi-negocio');
          }, 2000);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Error response:', errorData);
        showNotification('error', '❌ Error', errorData.error || 'Error al guardar. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('error', '❌ Error', 'Error de conexión. Verifica tu internet.');
    } finally {
      setLoading(false);
    }
  };

  const triggerCelebration = () => {
    // Confeti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ffd700', '#9333ea', '#f97316', '#22c55e']
    });
    
    // Sonido (opcional)
    try {
      const audio = new Audio('/sounds/rocket-launch.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // ============================================
  // PANTALLA DE CARGA
  // ============================================
  const LoadingOverlay = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center"
    >
      <div className="text-center max-w-md">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-24 h-24 mx-auto mb-8"
        >
          <div className="w-full h-full rounded-full bg-gradient-to-r from-purple-500 via-orange-500 to-yellow-500 p-1">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-yellow-400" />
            </div>
          </div>
        </motion.div>
        
        <motion.p
          key={loadingPhrase}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="text-xl text-purple-300 font-medium"
        >
          {loadingPhrase}
        </motion.p>
        
        <div className="mt-6 flex justify-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ 
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2
              }}
              className="w-2 h-2 rounded-full bg-purple-500"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );

  // ============================================
  // PASO 0: SELECTOR DE REALIDAD
  // ============================================
  const SelectorDeRealidad = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center p-6"
    >
      {/* Fondo con efecto matrix/grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a2e_1px,transparent_1px),linear-gradient(to_bottom,#1a1a2e_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-12 relative z-10"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <Zap className="w-10 h-10 text-yellow-400" />
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
            QUANTUM BUSINESS BUILDER
          </h1>
          <Zap className="w-10 h-10 text-yellow-400" />
        </div>
        <p className="text-slate-400 text-lg">
          Laboratorio de Materialización de Negocios
        </p>
      </motion.div>

      {/* Si ya tiene sitio web publicado, mostrar card de acceso directo */}
      {hasExistingWebsite && existingWebsite?.site && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-4xl mb-10 relative z-10"
        >
          <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-500/40 rounded-2xl p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Globe className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{existingWebsite.site.businessName}</h3>
                  <p className="text-purple-300 text-sm">{existingWebsite.url}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.open(`/site/${existingWebsite.site.slug}`, '_blank')}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Ver Sitio
                </button>
                <button
                  onClick={() => {
                    // Guardar datos en localStorage para precargar en Quantum Web
                    const prefillData = {
                      name: existingWebsite.site.businessName,
                      description: existingWebsite.site.businessDescription,
                      category: existingWebsite.site.businessCategory,
                      phone: existingWebsite.site.phone,
                      whatsapp: existingWebsite.site.whatsapp,
                      email: existingWebsite.site.email,
                      address: existingWebsite.site.address,
                      schedule: existingWebsite.site.schedule,
                      instagram: existingWebsite.site.instagram,
                      facebook: existingWebsite.site.facebook,
                      editMode: true,
                      existingSlug: existingWebsite.site.slug
                    };
                    localStorage.setItem('quantum_web_prefill', JSON.stringify(prefillData));
                    router.push('/dashboard/quantum-web');
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Editar Página
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Botón Compartir en la Expo - Visible si tiene perfil de negocio */}
      {hasExistingProfile && existingProfile && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="w-full max-w-4xl mb-8 relative z-10 space-y-4"
        >
          <ExpoShareSection 
            userId={existingProfile.userId} 
            userName={existingProfile.headline}
            visionId={existingProfile.vision?.id}
          />
          <ExpoReviewsSection userId={existingProfile.userId} />
        </motion.div>
      )}

      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-2xl md:text-3xl font-bold text-white mb-10 text-center relative z-10"
      >
        {hasExistingWebsite ? '¿QUIERES CREAR ALGO NUEVO?' : '¿DESDE DÓNDE VAS A CREAR HOY?'}
      </motion.h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl w-full relative z-10">
        {/* Opción A: Ya tengo negocio */}
        <motion.button
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.03, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setStep('optimizador')}
          className="group relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-emerald-900/50 to-teal-900/50 border border-emerald-500/30 hover:border-emerald-400/60 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <Building2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          
          <h3 className="text-2xl font-bold text-white mb-3">
            TENGO UN NEGOCIO
          </h3>
          
          <p className="text-emerald-300/80 text-sm">
            Ya tengo mi negocio operando y quiero escalarlo con la Tribu.
          </p>
          
          <div className="mt-6 flex items-center justify-center gap-2 text-emerald-400">
            <span className="text-sm font-medium">Optimizar Perfil</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.button>

        {/* Opción B: Quiero crear desde cero */}
        <motion.button
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          whileHover={{ scale: 1.03, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setStep('adn-talento')}
          className="group relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-purple-900/50 to-orange-900/50 border border-purple-500/30 hover:border-orange-400/60 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {/* Efecto de brillo animado */}
          <motion.div
            animate={{ 
              x: ['-100%', '200%'],
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
          />
          
          <Lightbulb className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          
          <h3 className="text-2xl font-bold text-white mb-3">
            QUIERO UNA IDEA MILLONARIA
          </h3>
          
          <p className="text-purple-300/80 text-sm">
            Tengo el talento pero me falta la forma. Ayúdame a crearlo desde cero con IA.
          </p>
          
          <div className="mt-6 flex items-center justify-center gap-2 text-orange-400">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium">Generar con IA</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.button>
      </div>

      {/* Indicador de perfil existente */}
      {hasExistingProfile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-center relative z-10"
        >
          <p className="text-slate-400 text-sm">
            ✨ Ya tienes un perfil creado.{' '}
            <button 
              onClick={() => router.push('/dashboard/mi-negocio')}
              className="text-purple-400 hover:text-purple-300 underline"
            >
              Ver mi perfil actual
            </button>
          </p>
        </motion.div>
      )}
    </motion.div>
  );

  // ============================================
  // PASO 1: ADN DEL TALENTO
  // ============================================
  const ADNTalento = () => (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen flex flex-col items-center justify-center p-6"
    >
      <div className="max-w-2xl w-full">
        <motion.button
          onClick={() => setStep('selector')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver</span>
        </motion.button>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 mb-4">
            <span className="text-purple-400 text-sm font-medium">PASO 1 DE 3</span>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">
            🧬 Extracción de tu ADN Emprendedor
          </h2>
          <p className="text-slate-400">
            Para crear tu abundancia, primero necesito conocer tu esencia
          </p>
        </div>

        <div className="space-y-8 bg-slate-900/50 rounded-2xl p-8 border border-slate-700/50">
          {/* Pregunta 1 */}
          <div>
            <label className="block text-lg font-medium text-white mb-3">
              ¿Qué amas hacer o en qué eres experto? 💎
            </label>
            <textarea
              ref={talentoRef}
              defaultValue={talento}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              placeholder="Ej: Me gusta cocinar postres, sé programar, soy bueno escuchando a la gente, me encanta diseñar..."
              className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none h-28"
            />
          </div>

          {/* Pregunta 2 */}
          <div>
            <label className="block text-lg font-medium text-white mb-3">
              ¿A quién quieres servir? 🎯
            </label>
            <textarea
              ref={audienciaRef}
              defaultValue={audiencia}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              placeholder="Ej: Mamás ocupadas, empresas pequeñas, jóvenes emprendedores, personas que quieren bajar de peso..."
              className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none h-28"
            />
          </div>

          {/* Botón de generar */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generateBusinessIdeas}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-orange-600 text-white font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/25 transition-all"
          >
            <Wand2 className="w-6 h-6" />
            <span>Materializar Ideas de Negocio</span>
            <Sparkles className="w-6 h-6" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  // ============================================
  // PASO 1.5: IDEAS DE NEGOCIO GENERADAS
  // ============================================
  const IdeasNegocio = () => (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen flex flex-col items-center justify-center p-6"
    >
      <div className="max-w-4xl w-full">
        <motion.button
          onClick={() => setStep('adn-talento')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Modificar respuestas</span>
        </motion.button>

        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30 mb-4"
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">¡MAGIA COMPLETADA!</span>
          </motion.div>
          
          <h2 className="text-3xl font-bold text-white mb-2">
            El universo te propone 3 caminos
          </h2>
          <p className="text-slate-400">
            Selecciona el concepto que más resuene con tu visión
          </p>
        </div>

        <div className="grid gap-6">
          {ideas.map((idea, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedIdea(idea);
                generateVisualIdentity();
              }}
              className={`w-full text-left p-6 rounded-2xl border transition-all ${
                selectedIdea?.nombre === idea.nombre
                  ? 'bg-purple-900/50 border-purple-500'
                  : 'bg-slate-900/50 border-slate-700/50 hover:border-purple-500/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-white">{index + 1}</span>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {idea.nombre}
                  </h3>
                  <p className="text-purple-400 text-sm mb-3 italic">
                    "{idea.slogan}"
                  </p>
                  <p className="text-slate-300 text-sm mb-2">
                    {idea.descripcion}
                  </p>
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <Target className="w-4 h-4" />
                    <span>Audiencia: {idea.audiencia}</span>
                  </div>
                </div>

                <ArrowRight className="w-6 h-6 text-purple-400 flex-shrink-0" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Botón para regenerar */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={generateBusinessIdeas}
          className="mt-6 mx-auto flex items-center gap-2 text-slate-400 hover:text-purple-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm">Generar nuevas ideas</span>
        </motion.button>
      </div>
    </motion.div>
  );

  // ============================================
  // PASO 2: IDENTIDAD VISUAL
  // ============================================
  const IdentidadVisual = () => (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen py-10 px-6"
    >
      <div className="max-w-5xl mx-auto">
        <motion.button
          onClick={() => setStep('ideas-negocio')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Elegir otro concepto</span>
        </motion.button>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 mb-4">
            <span className="text-purple-400 text-sm font-medium">PASO 2 DE 3</span>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">
            🎨 Materializando tu Marca
          </h2>
          <p className="text-slate-400">
            Concepto seleccionado: <span className="text-purple-400 font-medium">{selectedIdea?.nombre}</span>
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Columna izquierda: Nombres */}
          <div className="space-y-6">
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Type className="w-5 h-5 text-purple-400" />
                Nombre de tu Negocio
              </h3>
              
              <div className="space-y-3 mb-4">
                {generatedNames.map((name, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => {
                      setSelectedName(name.nombre);
                      setCustomName('');
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedName === name.nombre
                        ? 'bg-purple-600/30 border-purple-500'
                        : 'bg-slate-800/50 border-slate-600/50 hover:border-purple-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{name.nombre}</span>
                      {selectedName === name.nombre && (
                        <Check className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => {
                    setCustomName(e.target.value);
                    setSelectedName('');
                  }}
                  placeholder="O escribe tu propio nombre..."
                  className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Columna derecha: Logos */}
          <div className="space-y-6">
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-orange-400" />
                Logotipo Generado con IA
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {generatedLogos.length > 0 ? (
                  generatedLogos.map((logo, index) => (
                    <motion.button
                      key={logo.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.15 }}
                      onClick={() => handleSelectWizardLogo(logo.url, index)}
                      disabled={uploadingSelectedLogo}
                      className={`aspect-square rounded-xl border-2 overflow-hidden transition-all relative ${
                        selectedLogoIndex === index
                          ? 'border-orange-500 ring-4 ring-orange-500/30'
                          : 'border-slate-600/50 hover:border-orange-500/50'
                      } ${uploadingSelectedLogo && selectedLogoIndex !== index ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      <img 
                        src={logo.url} 
                        alt={`Logo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {uploadingSelectedLogo && selectedLogoIndex === index && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </motion.button>
                  ))
                ) : (
                  // Placeholders mientras carga
                  [1, 2, 3, 4].map((i) => (
                    <div 
                      key={i}
                      className="aspect-square rounded-xl bg-slate-800/50 border border-slate-600/50 flex items-center justify-center"
                    >
                      <ImageIcon className="w-10 h-10 text-slate-600" />
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => {/* Regenerar logos */}}
                className="mt-4 w-full py-2 text-sm text-slate-400 hover:text-purple-400 flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Generar más opciones</span>
              </button>
            </div>
          </div>
        </div>

        {/* Botón continuar */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={generatePitch}
          disabled={!selectedName && !customName}
          className="mt-10 w-full max-w-md mx-auto py-4 rounded-xl bg-gradient-to-r from-purple-600 to-orange-600 text-white font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/25 transition-all"
        >
          <span>Continuar al Pitch</span>
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.div>
  );

  // ============================================
  // PASO 3: PITCH Y OFERTA
  // ============================================
  const PitchOferta = useCallback(() => (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen py-10 px-6"
    >
      <div className="max-w-4xl mx-auto">
        <motion.button
          onClick={() => setStep('identidad-visual')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver a identidad visual</span>
        </motion.button>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 mb-4">
            <span className="text-purple-400 text-sm font-medium">PASO 3 DE 3</span>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">
            ✨ La Oferta Irresistible
          </h2>
          <p className="text-slate-400">
            Tu mensaje al mundo - generado con copywriting persuasivo
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Editor */}
          <div className="space-y-6">
            {/* Descripción */}
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Descripción del Servicio</h3>
                <button
                  onClick={improveDescription}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600/30 text-purple-400 hover:bg-purple-600/50 transition-colors text-sm"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Mejorar con AI</span>
                </button>
              </div>
              
              <textarea
                defaultValue={descripcion}
                onBlur={(e) => setDescripcion(e.target.value)}
                placeholder="Describe tu servicio o producto..."
                className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none h-40"
              />
            </div>

            {/* Oferta para la tribu */}
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5 text-orange-400" />
                Beneficio Exclusivo para la Tribu
              </h3>
              
              <input
                type="text"
                defaultValue={ofertaTribu}
                onBlur={(e) => setOfertaTribu(e.target.value)}
                placeholder="Ej: 15% de descuento, consulta gratis..."
                className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-400" />
              Vista Previa
            </h3>
            
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-600/30">
              {/* Logo y nombre */}
              <div className="flex items-center gap-4 mb-4">
                {selectedLogo ? (
                  <img 
                    src={selectedLogo} 
                    alt="Logo"
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {(customName || selectedName || 'N')[0]}
                    </span>
                  </div>
                )}
                <div>
                  <h4 className="text-xl font-bold text-white">
                    {customName || selectedName || 'Tu Negocio'}
                  </h4>
                  <p className="text-purple-400 text-sm italic">
                    {selectedIdea?.slogan}
                  </p>
                </div>
              </div>

              {/* Descripción */}
              <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                {descripcion || 'Tu descripción aparecerá aquí...'}
              </p>

              {/* Oferta */}
              {ofertaTribu && (
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-orange-400">
                    <Gift className="w-4 h-4" />
                    <span className="text-sm font-medium">Para la Tribu: {ofertaTribu}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botón continuar - Lleva a crear página web */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={async () => {
            // Guardar datos en localStorage para que Quantum Web los precargue
            setLoading(true);
            try {
              const nombreFinal = customName || selectedName || selectedIdea?.nombre || '';
              
              // 1. Guardar el perfil en talent-directory para que "Tengo un Negocio" lo cargue
              const profileData = {
                headline: nombreFinal,
                description: descripcion,
                discountOffer: ofertaTribu,
                logoUrl: selectedLogo || undefined,
                slogan: selectedIdea?.slogan || '',
                // Guardar audiencia del ADN para referencia
                targetAudience: audiencia,
                // Guardar talento/habilidad principal
                mainSkill: talento,
                status: 'HIDDEN' // Guardarlo como borrador
              };
              
              const saveRes = await fetch('/api/talent-directory/my-profile', {
                method: hasExistingProfile ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
              });
              
              if (saveRes.ok) {
                console.log('Perfil de Idea Millonaria guardado correctamente');
                // Actualizar estado para que el sistema sepa que ya hay perfil
                setHasExistingProfile(true);
              }
              
              // 2. Guardar en localStorage para Quantum Web
              const quantumData = {
                name: nombreFinal,
                description: descripcion,
                category: previewCategoria,
                logo: selectedLogo || '',
                slogan: selectedIdea?.slogan || '',
                discountOffer: ofertaTribu
              };
              
              localStorage.setItem('quantum_web_prefill', JSON.stringify(quantumData));
              console.log('Datos guardados para Quantum Web:', quantumData);
              
              // Redirigir a Quantum Web para crear la página
              router.push('/dashboard/quantum-web');
            } catch (error) {
              console.error('Error:', error);
              // Aún así redirigir a crear la página
              router.push('/dashboard/quantum-web');
            } finally {
              setLoading(false);
            }
          }}
          disabled={!descripcion.trim() || loading}
          className="mt-10 w-full max-w-md mx-auto py-4 rounded-xl bg-gradient-to-r from-purple-600 to-orange-600 text-white font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/25 transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Globe className="w-5 h-5" />
              <span>Crear Mi Página Web</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </motion.button>
        
        <p className="text-center text-slate-500 text-sm mt-3">
          Tu información se guardará y crearás tu página profesional con IA
        </p>
      </div>
    </motion.div>
  ), [descripcion, ofertaTribu, selectedLogo, customName, selectedName, selectedIdea, loading, hasExistingProfile, previewCategoria, router, improveDescription]);

  // ============================================
  // MOMENTO DE LA VERDAD (CIERRE ÉPICO)
  // ============================================
  const MomentoDeLaVerdad = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center p-6 relative"
    >
      {/* Fondo dramático */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-900 to-black" />
      
      {/* Haz de luz */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-purple-500/20 via-purple-500/5 to-transparent rounded-full blur-3xl"
      />

      <div className="relative z-10 max-w-2xl w-full text-center">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <Crown className="w-20 h-20 text-yellow-400 mx-auto mb-6" />
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Tu vehículo de abundancia está listo
          </h2>
          
          <p className="text-xl text-slate-400">
            Ahora debes elegir tu postura ante la vida.
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Botón SALTO CUÁNTICO (Principal) */}
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8, type: "spring" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => saveProfile(true)}
            disabled={loading}
            className="w-full py-6 rounded-2xl bg-gradient-to-r from-yellow-500 via-orange-500 to-purple-600 text-white font-bold text-xl shadow-2xl shadow-orange-500/30 relative overflow-hidden group"
          >
            {/* Efecto de pulso */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity
              }}
              className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-purple-600 rounded-2xl"
            />
            
            <div className="relative flex items-center justify-center gap-3">
              <Rocket className="w-7 h-7" />
              <span>DAR EL SALTO CUÁNTICO</span>
              <Sparkles className="w-7 h-7" />
            </div>
            
            <p className="relative text-sm text-white/80 mt-2">
              Lanzar al Mercado ahora. Me declaro listo para servir, vender y generar riqueza.
            </p>
          </motion.button>

          {/* Separador */}
          <div className="flex items-center gap-4 text-slate-600">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-sm">o</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Botón RAZONABLE (Secundario) */}
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => saveProfile(false)}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-slate-800/50 border border-slate-600/50 text-slate-400 font-medium hover:bg-slate-800 transition-all"
          >
            <div className="flex items-center justify-center gap-2">
              <Save className="w-5 h-5" />
              <span>PERMANECER RAZONABLE</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Guardar como borrador privado. No estoy listo para mostrarme al mundo.
            </p>
          </motion.button>
        </div>

        {/* Botón volver */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          onClick={() => setStep('pitch-oferta')}
          className="mt-8 text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          ← Volver a editar mi perfil
        </motion.button>
      </div>
    </motion.div>
  );

  // ============================================
  // OPTIMIZADOR (Para los que ya tienen negocio)
  // ============================================
  const optimizadorContent = (
    <motion.div
      key="optimizador"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen py-10 px-6"
    >
      <div className="max-w-6xl mx-auto">
        <motion.button
          onClick={() => setStep('selector')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver al inicio</span>
        </motion.button>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-4">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">OPTIMIZADOR DE PERFIL</span>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">
            Escala tu Imperio 🏰
          </h2>
          <p className="text-slate-400">
            Edita en tiempo real y ve cómo se verá tu perfil en el Mercado
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Columna izquierda: Editor */}
          <div className="space-y-6">
            {/* Información básica */}
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4">Información del Negocio</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Nombre / Titular</label>
                  <input
                    ref={optimizadorNombreRef}
                    type="text"
                    value={previewNombre}
                    onChange={(e) => setPreviewNombre(e.target.value)}
                    autoComplete="off"
                    placeholder="Escribe el nombre de tu negocio..."
                    className="w-full p-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    <Tag className="w-4 h-4 inline mr-1" />
                    Categoría de Servicio
                  </label>
                  <select
                    value={previewCategoria}
                    onChange={(e) => setPreviewCategoria(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white"
                  >
                    <option value="">Selecciona una categoría...</option>
                    {BUSINESS_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Descripción</label>
                  <div className="relative">
                    <textarea
                      ref={optimizadorDescripcionRef}
                      value={previewDescripcion}
                      onChange={(e) => setPreviewDescripcion(e.target.value)}
                      autoComplete="off"
                      placeholder="Describe tu negocio..."
                      className="w-full p-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white resize-none h-32 placeholder-slate-500"
                    />
                    <button
                      onClick={improveDescription}
                      className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-600/30 text-purple-400 text-xs hover:bg-purple-600/50 transition-colors"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>Mejorar con IA</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    <Gift className="w-4 h-4 inline mr-1" />
                    Oferta para la Tribu
                  </label>
                  <input
                    ref={optimizadorOfertaRef}
                    type="text"
                    value={previewOferta}
                    onChange={(e) => setPreviewOferta(e.target.value)}
                    autoComplete="off"
                    placeholder="Ej: 10% de descuento para la tribu"
                    className="w-full p-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Logo del Negocio */}
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4">
                <Palette className="w-5 h-5 inline mr-2" />
                Logo del Negocio
              </h3>
              
              <div className="space-y-4">
                {/* Preview del logo actual */}
                {previewLogo ? (
                  <div className="relative w-32 h-32 mx-auto">
                    <img 
                      src={previewLogo} 
                      alt="Logo" 
                      className="w-full h-full rounded-xl object-cover border-2 border-emerald-500/50"
                    />
                    <button
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 mx-auto rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center bg-slate-800/30">
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 text-slate-500 mx-auto mb-1" />
                      <span className="text-xs text-slate-500">Sin logo</span>
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-3">
                  {/* Subir logo */}
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploadingLogo}
                    />
                    <div className={`w-full py-3 px-4 rounded-xl border border-slate-600/50 text-center transition-all ${
                      uploadingLogo 
                        ? 'bg-slate-700/50 cursor-wait' 
                        : 'bg-slate-800/50 hover:bg-slate-700/50 hover:border-emerald-500/50'
                    }`}>
                      {uploadingLogo ? (
                        <div className="flex items-center justify-center gap-2 text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Subiendo...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-slate-300">
                          <Camera className="w-4 h-4" />
                          <span className="text-sm">Subir Logo</span>
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Generar con IA */}
                  <button
                    onClick={generateLogoWithAI}
                    disabled={generatingLogo || !previewNombre.trim()}
                    className={`flex-1 py-3 px-4 rounded-xl border transition-all ${
                      generatingLogo 
                        ? 'bg-purple-900/30 border-purple-500/30 cursor-wait' 
                        : previewNombre.trim()
                          ? 'bg-purple-900/20 border-purple-500/30 hover:bg-purple-900/40 hover:border-purple-500/50'
                          : 'bg-slate-800/30 border-slate-600/30 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {generatingLogo ? (
                      <div className="flex items-center justify-center gap-2 text-purple-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Creando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-purple-400">
                        <Wand2 className="w-4 h-4" />
                        <span className="text-sm">Crear con IA</span>
                      </div>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500 text-center">
                  Sube tu logo o genera uno automáticamente con IA
                </p>
              </div>
            </div>

            {/* Contacto */}
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4">Contacto</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Teléfono del Negocio
                  </label>
                  <input
                    type="tel"
                    value={previewTelefono}
                    onChange={(e) => setPreviewTelefono(e.target.value)}
                    autoComplete="off"
                    placeholder="Ej: +52 123 456 7890"
                    className="w-full p-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    <svg className="w-4 h-4 inline mr-1" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={previewWhatsapp}
                    onChange={(e) => setPreviewWhatsapp(e.target.value)}
                    autoComplete="off"
                    placeholder="Ej: +52 123 456 7890"
                    className="w-full p-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Página Web
                  </label>
                  <div className="space-y-3">
                    <input
                      type="url"
                      value={previewWebsite}
                      onChange={(e) => setPreviewWebsite(e.target.value)}
                      autoComplete="off"
                      placeholder="https://www.tunegocio.com"
                      className="w-full p-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500"
                    />
                    
                    {/* Oferta para crear web con IA si no tiene */}
                    {!previewWebsite && (
                      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/30">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-semibold text-sm mb-1">
                              ¿No tienes página web? 🚀
                            </h4>
                            <p className="text-purple-300/80 text-xs mb-3">
                              Crea tu sitio web profesional con tienda en línea en menos de 5 minutos usando IA
                            </p>
                            <button
                              onClick={() => {
                                // Guardar datos actuales en localStorage para Quantum Web
                                const quantumData = {
                                  name: previewNombre || '',
                                  description: previewDescripcion || '',
                                  category: previewCategoria || '',
                                  logo: previewLogo || '',
                                  phone: previewTelefono || '',
                                  whatsapp: previewWhatsapp || '',
                                  address: previewDireccion || '',
                                  schedule: previewHorario || '',
                                  discountOffer: previewOferta || ''
                                };
                                localStorage.setItem('quantum_web_prefill', JSON.stringify(quantumData));
                                console.log('Datos guardados para Quantum Web:', quantumData);
                                router.push('/dashboard/quantum-web');
                              }}
                              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-2"
                            >
                              <Wand2 className="w-4 h-4" />
                              <span>Crear mi Web con IA</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Ubicación */}
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4">
                <MapPin className="w-5 h-5 inline mr-2" />
                Ubicación
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Dirección</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={previewDireccion}
                      onChange={(e) => setPreviewDireccion(e.target.value)}
                      autoComplete="off"
                      placeholder="Escribe tu dirección o selecciona en el mapa"
                      className="flex-1 p-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500"
                    />
                    <button
                      onClick={() => setShowMapModal(true)}
                      className="px-4 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                      title="Seleccionar en el mapa"
                    >
                      <Globe className="w-5 h-5" />
                    </button>
                    <button
                      onClick={getCurrentLocation}
                      className="px-4 py-3 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition-colors"
                      title="Usar mi ubicación actual"
                    >
                      <MapPin className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Mini preview del mapa si hay coordenadas */}
                  {previewLatitud && previewLongitud && (
                    <div className="mt-3">
                      <div 
                        className="relative h-32 rounded-xl overflow-hidden cursor-pointer group"
                        onClick={() => setShowMapModal(true)}
                      >
                        <img 
                          src={`https://staticmap.openstreetmap.de/staticmap.php?center=${previewLatitud},${previewLongitud}&zoom=15&size=400x150&markers=${previewLatitud},${previewLongitud},red-pushpin`}
                          alt="Ubicación en mapa"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <span className="text-white text-sm font-medium">Editar ubicación</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        📍 {previewLatitud.toFixed(4)}, {previewLongitud.toFixed(4)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Horario de Atención */}
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4">
                <Clock className="w-5 h-5 inline mr-2" />
                Horario de Atención
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={previewHorario}
                      readOnly
                      placeholder="Configura tu horario de atención"
                      className="flex-1 p-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 cursor-pointer"
                      onClick={() => setShowHorarioModal(true)}
                    />
                    <button
                      onClick={() => setShowHorarioModal(true)}
                      className="px-4 py-3 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/30 transition-colors"
                      title="Configurar horario"
                    >
                      <Clock className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Preview de horarios */}
                  {previewHorario && (
                    <div className="mt-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700/50">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(horarioConfig).map(([dia, config]) => (
                          <div key={dia} className={`flex items-center justify-between p-2 rounded-lg ${config.abierto ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                            <span className="capitalize text-slate-300">{dia}</span>
                            <span className={config.abierto ? 'text-emerald-400' : 'text-red-400'}>
                              {config.abierto ? `${config.desde} - ${config.hasta}` : 'Cerrado'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fotos del Negocio */}
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4">
                <Camera className="w-5 h-5 inline mr-2" />
                Fotos del Negocio
                <span className="text-sm font-normal text-slate-400 ml-2">
                  ({previewFotos.length}/5)
                </span>
              </h3>
              
              <div className="space-y-4">
                {/* Grid de fotos */}
                <div className="grid grid-cols-3 gap-3">
                  {previewFotos.map((foto, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                      <img src={foto} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeFoto(index)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {/* Botón agregar foto */}
                  {previewFotos.length < 5 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 hover:bg-slate-800/30 transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFotoUpload}
                        className="hidden"
                        disabled={uploadingFoto}
                      />
                      {uploadingFoto ? (
                        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-8 h-8 text-slate-400" />
                          <span className="text-xs text-slate-500 mt-1">Agregar</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Sube hasta 5 fotos de tu negocio, productos o servicios
                </p>
              </div>
            </div>

            {/* Compartir en la Expo */}
            <ExpoShareSection 
              userId={existingProfile?.userId} 
              userName={previewNombre || existingProfile?.headline}
              visionId={existingProfile?.vision?.id}
            />

            {/* Calificaciones de la Expo */}
            <ExpoReviewsSection userId={existingProfile?.userId} />
          </div>

          {/* Columna derecha: Preview en vivo */}
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50 sticky top-6 h-fit">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-400" />
              Vista Previa en Vivo
            </h3>
            
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-600/30">
              {/* Header con logo/inicial y nombre */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center overflow-hidden">
                  {previewLogo ? (
                    <img src={previewLogo} alt="Logo" className="w-full h-full object-cover" />
                  ) : previewFotos.length > 0 ? (
                    <img src={previewFotos[0]} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      {(previewNombre || existingProfile?.headline || 'N')[0]}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">
                    {previewNombre || existingProfile?.headline || 'Tu Negocio'}
                  </h4>
                  <div className="flex items-center gap-1 text-yellow-400">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                    <span className="text-slate-400 text-sm ml-2">5.0</span>
                  </div>
                </div>
              </div>

              {/* Categoría */}
              {previewCategoria && (
                <div className="mb-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                    {BUSINESS_CATEGORIES.find(c => c.value === previewCategoria)?.icon}
                    {BUSINESS_CATEGORIES.find(c => c.value === previewCategoria)?.label.replace(/^[^\s]+ /, '')}
                  </span>
                </div>
              )}

              {/* Descripción */}
              <p className="text-slate-300 text-sm mb-4">
                {previewDescripcion || existingProfile?.description || 'Tu descripción aparecerá aquí...'}
              </p>

              {/* Fotos */}
              {previewFotos.length > 1 && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {previewFotos.slice(1).map((foto, i) => (
                    <img key={i} src={foto} alt={`Foto ${i + 2}`} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  ))}
                </div>
              )}

              {/* Contacto */}
              {(previewTelefono || previewWhatsapp || previewWebsite) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {previewTelefono && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-xs">
                      <Phone className="w-3 h-3" />
                      {previewTelefono}
                    </span>
                  )}
                  {previewWhatsapp && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                      </svg>
                      WhatsApp
                    </span>
                  )}
                  {previewWebsite && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs">
                      <Globe className="w-3 h-3" />
                      Web
                    </span>
                  )}
                </div>
              )}

              {/* Ubicación */}
              {previewDireccion && (
                <div className="flex items-start gap-2 mb-4 p-2 rounded-lg bg-slate-700/30">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-400 line-clamp-2">{previewDireccion}</span>
                </div>
              )}

              {/* Oferta */}
              {(previewOferta || existingProfile?.discountOffer) && (
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Gift className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {previewOferta || existingProfile?.discountOffer}
                    </span>
                  </div>
                </div>
              )}

              {/* Indicador de visibilidad */}
              <div className={`mt-4 p-3 rounded-lg text-center text-sm ${
                esIrrazonable 
                  ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300' 
                  : 'bg-slate-700/30 border border-slate-600/30 text-slate-400'
              }`}>
                {esIrrazonable ? (
                  <>🚀 Visible en el Directorio de Negocios</>
                ) : (
                  <>🔒 Solo para Expo de Futuros Imposibles</>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Switch Razonable / Irrazonable */}
        <div className="mt-10 bg-gradient-to-r from-slate-900/80 to-purple-900/30 rounded-2xl p-6 border border-purple-500/20">
          <div className="flex items-start gap-6">
            {/* Switch */}
            <div className="flex-shrink-0">
              <button
                onClick={() => setEsIrrazonable(!esIrrazonable)}
                className={`relative w-20 h-10 rounded-full transition-all duration-300 ${
                  esIrrazonable 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600' 
                    : 'bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 w-8 h-8 rounded-full bg-white shadow-lg transition-all duration-300 flex items-center justify-center ${
                  esIrrazonable ? 'left-11' : 'left-1'
                }`}>
                  {esIrrazonable ? (
                    <Rocket className="w-4 h-4 text-purple-600" />
                  ) : (
                    <span className="text-slate-400 text-xs">🤔</span>
                  )}
                </div>
              </button>
            </div>

            {/* Descripción */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className={`font-bold text-lg ${esIrrazonable ? 'text-purple-300' : 'text-slate-300'}`}>
                  {esIrrazonable ? '🔥 IRRAZONABLE' : '😌 Razonable'}
                </h4>
                {esIrrazonable && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 text-xs font-medium animate-pulse">
                    Recomendado
                  </span>
                )}
              </div>
              
              {esIrrazonable ? (
                <div className="space-y-2">
                  <p className="text-purple-200 text-sm">
                    <strong>¡Dar el salto!</strong> Tu negocio será <span className="text-white font-semibold">público en el Directorio de Negocios</span> de la organización.
                  </p>
                  <ul className="text-purple-300/80 text-xs space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-emerald-400" />
                      Los usuarios podrán encontrarte y ver tu perfil
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-emerald-400" />
                      Podrán obtener tus datos de contacto
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-emerald-400" />
                      Recibirás solicitudes de contratación
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-emerald-400" />
                      Acceso a reseñas y calificaciones
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-slate-400 text-sm">
                    Solo para la <strong>actividad del salon mantener privado</strong>. Tu perfil quedará guardado pero no será visible públicamente.
                  </p>
                  <p className="text-slate-500 text-xs">
                    Puedes cambiar a Irrazonable cuando estés listo para dar el salto.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botón guardar */}
        <div className="flex justify-center mt-10 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => saveProfile(false)}
            className="px-8 py-3 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors"
          >
            Guardar Cambios
          </motion.button>
          
          {esIrrazonable && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => saveProfile(true)}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center gap-2"
            >
              <Rocket className="w-5 h-5" />
              <span>🚀 Publicar en Directorio</span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );

  // ============================================
  // RENDER PRINCIPAL
  // ============================================
  
  // Pantalla de carga mientras verifica acceso
  if (hasAccess === null || checkingWebsite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando tu negocio...</p>
        </div>
      </div>
    );
  }

  // Pantalla de acceso restringido
  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700/50 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <Lock className="w-10 h-10 text-amber-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-3">
              Contenido Exclusivo
            </h1>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-semibold">Programa de Liderato</span>
            </div>
            
            <p className="text-slate-400 mb-6">
              Esta sección está disponible para participantes 
              <span className="text-amber-300 font-medium"> inscritos en Programa de Liderato</span> o que han 
              <span className="text-emerald-300 font-medium"> completado el nivel Avanzado</span>.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <AnimatePresence mode="wait">
        {loading && <LoadingOverlay key="loading" />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'selector' && <SelectorDeRealidad key="selector" />}
        {step === 'adn-talento' && <ADNTalento key="adn" />}
        {step === 'ideas-negocio' && <IdeasNegocio key="ideas" />}
        {step === 'identidad-visual' && <IdentidadVisual key="visual" />}
        {step === 'pitch-oferta' && PitchOferta()}
        {step === 'momento-verdad' && <MomentoDeLaVerdad key="verdad" />}
        {step === 'optimizador' && optimizadorContent}
      </AnimatePresence>

      {/* Modal de Selección de Logo IA */}
      <AnimatePresence>
        {showLogoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowLogoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl border border-slate-700/50 w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-700/50 bg-gradient-to-r from-purple-900/30 to-pink-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Wand2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Logos Generados con IA</h3>
                      <p className="text-sm text-purple-300/80">Selecciona el que más te guste</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLogoModal(false)}
                    className="p-2 rounded-lg hover:bg-slate-700/50 transition text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Grid de Logos */}
              <div className="p-5 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-2 gap-4">
                  {logoOptions.map((logo, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => selectLogoFromModal(logo.url)}
                      className="group relative aspect-square bg-slate-800/50 rounded-xl border-2 border-slate-600/50 hover:border-purple-500 transition-all overflow-hidden"
                    >
                      <img
                        src={logo.url}
                        alt={`Logo opción ${index + 1}`}
                        className="w-full h-full object-contain p-3"
                      />
                      {/* Overlay de selección */}
                      <div className="absolute inset-0 bg-gradient-to-t from-purple-600/80 to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end justify-center pb-4">
                        <span className="text-white font-medium text-sm flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          Seleccionar
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Mensaje si no hay logos */}
                {logoOptions.length === 0 && !generatingLogo && (
                  <div className="text-center py-8">
                    <p className="text-slate-400">No hay logos disponibles</p>
                  </div>
                )}

                {/* Loading mientras genera */}
                {generatingLogo && (
                  <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-3" />
                    <p className="text-purple-300 font-medium">Generando nuevos diseños...</p>
                  </div>
                )}
              </div>

              {/* Footer con acciones */}
              <div className="p-5 border-t border-slate-700/50 bg-slate-800/30">
                <div className="flex gap-3">
                  <button
                    onClick={regenerateLogosInModal}
                    disabled={generatingLogo}
                    className="flex-1 py-3 px-4 rounded-xl border border-purple-500/50 text-purple-400 font-medium hover:bg-purple-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                  >
                    {generatingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Generar Nuevos
                  </button>
                  <button
                    onClick={() => setShowLogoModal(false)}
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-700/50 text-slate-300 font-medium hover:bg-slate-700 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
                <p className="text-xs text-slate-500 text-center mt-3">
                  💡 Puedes generar nuevos diseños las veces que quieras
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Selección de Ubicación en Mapa */}
      <AnimatePresence>
        {showMapModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowMapModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-700/50 bg-gradient-to-r from-emerald-900/30 to-blue-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Seleccionar Ubicación</h3>
                      <p className="text-sm text-emerald-300/80">Busca tu dirección o usa el mapa</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMapModal(false)}
                    className="p-2 rounded-lg hover:bg-slate-700/50 transition text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Buscador de direcciones */}
              <div className="p-5 border-b border-slate-700/50">
                <div className="relative">
                  <input
                    type="text"
                    value={mapSearchQuery}
                    onChange={(e) => setMapSearchQuery(e.target.value)}
                    placeholder="Buscar dirección, ciudad, código postal..."
                    className="w-full p-4 pl-12 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    {searchingAddress ? (
                      <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                    ) : (
                      <Target className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Sugerencias de direcciones */}
                {addressSuggestions.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {addressSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => selectAddress(suggestion)}
                        className="w-full p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 text-left hover:bg-slate-700/50 hover:border-emerald-500/50 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-300 group-hover:text-white transition line-clamp-2">
                            {suggestion.display_name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Vista del mapa */}
              <div className="p-5">
                <div className="relative h-64 rounded-xl overflow-hidden bg-slate-800">
                  {previewLatitud && previewLongitud ? (
                    <>
                      <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${previewLongitud - 0.01},${previewLatitud - 0.01},${previewLongitud + 0.01},${previewLatitud + 0.01}&layer=mapnik&marker=${previewLatitud},${previewLongitud}`}
                        className="w-full h-full border-0"
                        style={{ filter: 'invert(90%) hue-rotate(180deg)' }}
                      />
                      <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 backdrop-blur rounded-lg p-3">
                        <p className="text-sm text-white font-medium truncate">{previewDireccion}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          📍 {previewLatitud.toFixed(6)}, {previewLongitud.toFixed(6)}
                        </p>
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

              {/* Footer con acciones */}
              <div className="p-5 border-t border-slate-700/50 bg-slate-800/30">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      getCurrentLocation();
                      // Cerrar modal después de un momento para que se actualice la ubicación
                      setTimeout(() => setShowMapModal(false), 1500);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl border border-blue-500/50 text-blue-400 font-medium hover:bg-blue-500/10 transition-all flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Usar Mi Ubicación
                  </button>
                  <button
                    onClick={() => setShowMapModal(false)}
                    disabled={!previewLatitud || !previewLongitud}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 text-white font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    Confirmar Ubicación
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
                          exit={{ opacity: 0, height: 0 }}
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
                      id="horario-desde-all"
                      className="flex-1 p-2 rounded-lg bg-slate-700 border border-slate-600/50 text-white text-center"
                    />
                    <span className="text-slate-500">→</span>
                    <input
                      type="time"
                      defaultValue="18:00"
                      id="horario-hasta-all"
                      className="flex-1 p-2 rounded-lg bg-slate-700 border border-slate-600/50 text-white text-center"
                    />
                    <button
                      onClick={() => {
                        const desde = (document.getElementById('horario-desde-all') as HTMLInputElement)?.value || '09:00';
                        const hasta = (document.getElementById('horario-hasta-all') as HTMLInputElement)?.value || '18:00';
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

              {/* Footer con acciones */}
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
                      // Generar string de horario legible
                      const diasAbiertos = Object.entries(horarioConfig)
                        .filter(([_, cfg]) => cfg.abierto)
                        .map(([dia, cfg]) => `${dia.charAt(0).toUpperCase() + dia.slice(1, 3)}: ${cfg.desde}-${cfg.hasta}`);
                      
                      // Agrupar días con mismo horario
                      const horarioGroups: { [horario: string]: string[] } = {};
                      Object.entries(horarioConfig).forEach(([dia, cfg]) => {
                        if (cfg.abierto) {
                          const key = `${cfg.desde}-${cfg.hasta}`;
                          if (!horarioGroups[key]) horarioGroups[key] = [];
                          horarioGroups[key].push(dia);
                        }
                      });
                      
                      // Crear string compacto
                      const diasCortos: { [key: string]: string } = {
                        lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue',
                        viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom'
                      };
                      
                      const horarioStr = Object.entries(horarioGroups)
                        .map(([horario, dias]) => {
                          const diasStr = dias.map(d => diasCortos[d] || d).join('-');
                          return `${diasStr} ${horario}`;
                        })
                        .join(' | ');
                      
                      setPreviewHorario(horarioStr || 'Sin horario definido');
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

      {/* Notificación personalizada */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-6 left-1/2 z-[100] max-w-md w-full px-4"
          >
            <div className={`
              rounded-2xl p-4 shadow-2xl backdrop-blur-xl border
              ${notification.type === 'success' 
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30' 
                : notification.type === 'error'
                ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/30'
                : 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30'}
            `}>
              <div className="flex items-start gap-3">
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                  ${notification.type === 'success' 
                    ? 'bg-green-500/30' 
                    : notification.type === 'error'
                    ? 'bg-red-500/30'
                    : 'bg-blue-500/30'}
                `}>
                  {notification.type === 'success' && <Check className="w-5 h-5 text-green-400" />}
                  {notification.type === 'error' && <X className="w-5 h-5 text-red-400" />}
                  {notification.type === 'info' && <Save className="w-5 h-5 text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold text-base">{notification.title}</h4>
                  <p className="text-slate-300 text-sm mt-0.5">{notification.message}</p>
                </div>
                <button
                  onClick={() => setNotification(null)}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
