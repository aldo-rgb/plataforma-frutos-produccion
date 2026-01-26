'use client';

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  Gift
} from 'lucide-react';
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
// COMPONENTE PRINCIPAL
// ============================================
export default function QuantumBusinessBuilderPage() {
  const router = useRouter();
  
  // Refs para los textareas (evitar re-renders)
  const talentoRef = useRef<HTMLTextAreaElement>(null);
  const audienciaRef = useRef<HTMLTextAreaElement>(null);
  
  // Estado del wizard
  const [step, setStep] = useState<WizardStep>('selector');
  const [loading, setLoading] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);
  
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
  const [heroImage, setHeroImage] = useState('');
  
  // Pitch (Paso 3)
  const [descripcion, setDescripcion] = useState('');
  const [ofertaTribu, setOfertaTribu] = useState('');
  
  // Datos existentes (para optimizador)
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  
  // Efecto para rotar frases de carga
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingPhrase(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  // Verificar si ya tiene perfil al cargar
  useEffect(() => {
    checkExistingProfile();
  }, []);

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
    if (!descripcion.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/quantum-business/improve-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: descripcion })
      });
      
      if (res.ok) {
        const data = await res.json();
        setDescripcion(data.mejorado || descripcion);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FUNCIONES DE GUARDADO
  // ============================================
  
  const saveProfile = async (publish: boolean) => {
    setLoading(true);
    try {
      const nombreFinal = customName || selectedName || selectedIdea?.nombre || '';
      
      const profileData = {
        headline: nombreFinal,
        description: descripcion,
        discountOffer: ofertaTribu,
        logoUrl: selectedLogo,
        heroImage: heroImage,
        isAiGenerated: true,
        aiSeedData: JSON.stringify({ talento, audiencia, selectedIdea }),
        status: publish ? 'ACTIVE' : 'DRAFT'
      };
      
      const res = await fetch('/api/talent-directory/my-profile', {
        method: hasExistingProfile ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      
      if (res.ok) {
        if (publish) {
          // Efecto de celebración
          triggerCelebration();
          setTimeout(() => {
            router.push('/dashboard/mercado');
          }, 3000);
        } else {
          alert('💾 Guardado como borrador. Recuerda: El éxito ama la velocidad.');
          router.push('/dashboard/mi-negocio');
        }
      } else {
        alert('Error al guardar. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
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

      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-2xl md:text-3xl font-bold text-white mb-10 text-center relative z-10"
      >
        ¿DESDE DÓNDE VAS A CREAR HOY?
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
            TENGO UN IMPERIO
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
                      onClick={() => setSelectedLogo(logo.url)}
                      className={`aspect-square rounded-xl border-2 overflow-hidden transition-all ${
                        selectedLogo === logo.url
                          ? 'border-orange-500 ring-4 ring-orange-500/30'
                          : 'border-slate-600/50 hover:border-orange-500/50'
                      }`}
                    >
                      <img 
                        src={logo.url} 
                        alt={`Logo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
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
  const PitchOferta = () => (
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
                  <span>Mejorar con IA</span>
                </button>
              </div>
              
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
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
                value={ofertaTribu}
                onChange={(e) => setOfertaTribu(e.target.value)}
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

        {/* Botón continuar */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setStep('momento-verdad')}
          disabled={!descripcion.trim()}
          className="mt-10 w-full max-w-md mx-auto py-4 rounded-xl bg-gradient-to-r from-purple-600 to-orange-600 text-white font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/25 transition-all"
        >
          <span>El Momento de la Verdad</span>
          <Zap className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.div>
  );

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
  const Optimizador = () => (
    <motion.div
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
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4">Información del Negocio</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Nombre / Titular</label>
                  <input
                    type="text"
                    value={customName || existingProfile?.headline || ''}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Descripción</label>
                  <div className="relative">
                    <textarea
                      value={descripcion || existingProfile?.description || ''}
                      onChange={(e) => setDescripcion(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white resize-none h-32"
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
                  <label className="block text-sm text-slate-400 mb-2">Oferta para la Tribu</label>
                  <input
                    type="text"
                    value={ofertaTribu || existingProfile?.discountOffer || ''}
                    onChange={(e) => setOfertaTribu(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha: Preview en vivo */}
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50 sticky top-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-400" />
              Vista Previa en Vivo
            </h3>
            
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-600/30">
              {/* Contenido del preview */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {(customName || existingProfile?.headline || 'N')[0]}
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">
                    {customName || existingProfile?.headline || 'Tu Negocio'}
                  </h4>
                  <div className="flex items-center gap-1 text-yellow-400">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                    <span className="text-slate-400 text-sm ml-2">5.0</span>
                  </div>
                </div>
              </div>

              <p className="text-slate-300 text-sm mb-4">
                {descripcion || existingProfile?.description || 'Tu descripción aparecerá aquí...'}
              </p>

              {(ofertaTribu || existingProfile?.discountOffer) && (
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Gift className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {ofertaTribu || existingProfile?.discountOffer}
                    </span>
                  </div>
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
            Guardar Borrador
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => saveProfile(true)}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2"
          >
            <Rocket className="w-5 h-5" />
            <span>Publicar Cambios</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  // ============================================
  // RENDER PRINCIPAL
  // ============================================
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
        {step === 'pitch-oferta' && <PitchOferta key="pitch" />}
        {step === 'momento-verdad' && <MomentoDeLaVerdad key="verdad" />}
        {step === 'optimizador' && <Optimizador key="optimizador" />}
      </AnimatePresence>
    </div>
  );
}
