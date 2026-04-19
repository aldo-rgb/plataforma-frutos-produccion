'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, X, Eye, EyeOff, Loader2, CheckCircle, 
  User, Mail, Lock, Phone, Calendar, Target,
  ArrowRight, Volume2, VolumeX, Pause
} from 'lucide-react';

// URL del video - CAMBIAR ESTO cuando subas el video a un servicio de hosting
// Opciones recomendadas: Bunny.net, Cloudflare Stream, Vimeo Pro
const VIDEO_URL = 'https://nzk7icfrpepujjlf.public.blob.vercel-storage.com/IMPACTO%20CUANTICO%202.1.mp4'; // Reemplazar con tu URL
const VIDEO_TYPE = 'direct'; // 'vimeo' | 'bunny' | 'cloudflare' | 'direct'

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  confirmEmail: string;
  phone: string;
  birthdate: string;
  referralCode: string;
  password: string;
  confirmPassword: string;
  goal1: string;
  goal2: string;
  goal3: string;
}

export default function VideoLandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    confirmEmail: '',
    phone: '',
    birthdate: '',
    referralCode: refCode || '',
    password: '',
    confirmPassword: '',
    goal1: '',
    goal2: '',
    goal3: '',
  });

  // Iniciar video automáticamente
  useEffect(() => {
    if (videoRef.current && VIDEO_TYPE === 'direct') {
      videoRef.current.play().catch(() => {
        // Autoplay blocked, user needs to interact
      });
    }
  }, []);

  const handleVideoEnd = () => {
    setVideoEnded(true);
    setVideoPlaying(false);
  };

  const handleStartVideo = () => {
    setVideoStarted(true);
    setVideoPlaying(true);
    if (videoRef.current) {
      videoRef.current.play();
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setVideoPlaying(true);
      } else {
        videoRef.current.pause();
        setVideoPlaying(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    if (!formData.firstName || !formData.lastName) {
      setError('Por favor ingresa tu nombre completo');
      return false;
    }
    if (!formData.email || !formData.email.includes('@')) {
      setError('Por favor ingresa un email válido');
      return false;
    }
    if (formData.email !== formData.confirmEmail) {
      setError('Los emails no coinciden');
      return false;
    }
    if (!formData.phone) {
      setError('Por favor ingresa tu teléfono');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.password || formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setError('');
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Crear usuario
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          password: formData.password,
          telefono: formData.phone,
          fechaNacimiento: formData.birthdate || null,
          referralCode: formData.referralCode || null,
          // Metas
          goals: [formData.goal1, formData.goal2, formData.goal3].filter(Boolean),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar');
      }

      setSuccess(true);
      
      // Auto login después de 2 segundos
      setTimeout(async () => {
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });
        
        if (result?.ok) {
          router.push('/dashboard');
        }
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Error al registrar. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Video Background */}
      <div className="fixed inset-0 z-0">
        {VIDEO_TYPE === 'vimeo' ? (
          <iframe
            src={`${VIDEO_URL}?autoplay=1&muted=1&loop=0&background=0&controls=0`}
            className="absolute w-full h-full object-cover"
            style={{ 
              width: '177.77777778vh',
              minWidth: '100%',
              height: '56.25vw',
              minHeight: '100%',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            className="absolute w-full h-full object-cover"
            playsInline
            muted={isMuted}
            onEnded={handleVideoEnd}
            onPlay={() => setVideoPlaying(true)}
            onPause={() => setVideoPlaying(false)}
          >
            <source src={VIDEO_URL} type="video/mp4" />
          </video>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />
      </div>

      {/* Play Button Overlay (antes de iniciar) */}
      {!videoStarted && VIDEO_TYPE === 'direct' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70">
          <button
            onClick={handleStartVideo}
            className="group flex flex-col items-center gap-6"
          >
            <div className="w-32 h-32 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl shadow-cyan-500/30">
              <Play className="w-16 h-16 text-white ml-2" />
            </div>
            <span className="text-white text-xl font-medium">Reproducir Video</span>
          </button>
        </div>
      )}

      {/* Controls flotantes */}
      {videoStarted && VIDEO_TYPE === 'direct' && (
        <div className="fixed bottom-8 left-8 z-40 flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
          >
            {videoPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white" />
            )}
          </button>
          <button
            onClick={toggleMute}
            className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6 text-white" />
            ) : (
              <Volume2 className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      )}

      {/* CTA Flotante - Siempre visible */}
      <div className="fixed bottom-8 right-8 z-40">
        <button
          onClick={() => setShowRegisterModal(true)}
          className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold text-lg rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-violet-500/30"
        >
          <span>REGISTRARME</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Logo y branding superior */}
      <div className="fixed top-8 left-8 z-40">
        <img 
          src="/images/logo-quantum-white.png" 
          alt="Impacto Cuántico"
          className="h-12 w-auto"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      {/* Modal de Registro */}
      <AnimatePresence>
        {showRegisterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Close button */}
              <button
                onClick={() => setShowRegisterModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 transition-colors z-10"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>

              {success ? (
                <div className="p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">¡Registro Exitoso!</h2>
                  <p className="text-slate-400 mb-4">Bienvenido a Impacto Cuántico</p>
                  <p className="text-sm text-slate-500">Redirigiendo al dashboard...</p>
                </div>
              ) : (
                <div className="p-8">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Únete a Impacto Cuántico
                    </h2>
                    <p className="text-slate-400">
                      Paso {currentStep} de 3
                    </p>
                    {/* Progress bar */}
                    <div className="flex gap-2 mt-4">
                      {[1, 2, 3].map((step) => (
                        <div
                          key={step}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            step <= currentStep ? 'bg-cyan-500' : 'bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Step 1: Datos Personales */}
                    {currentStep === 1 && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Nombre
                            </label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                              <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                                placeholder="Tu nombre"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Apellido
                            </label>
                            <input
                              type="text"
                              name="lastName"
                              value={formData.lastName}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                              placeholder="Tu apellido"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Email
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                              placeholder="tu@email.com"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Confirmar Email
                          </label>
                          <input
                            type="email"
                            name="confirmEmail"
                            value={formData.confirmEmail}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                            placeholder="Confirma tu email"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Teléfono
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                              placeholder="+52 123 456 7890"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Fecha de Nacimiento (opcional)
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                              type="date"
                              name="birthdate"
                              value={formData.birthdate}
                              onChange={handleInputChange}
                              className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                            />
                          </div>
                        </div>

                        {/* Código de referido */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Código de Referido (opcional)
                          </label>
                          <input
                            type="text"
                            name="referralCode"
                            value={formData.referralCode}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                            placeholder="Si tienes un código, ingrésalo aquí"
                          />
                        </div>
                      </>
                    )}

                    {/* Step 2: Contraseña */}
                    {currentStep === 2 && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Contraseña
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              name="password"
                              value={formData.password}
                              onChange={handleInputChange}
                              className="w-full pl-11 pr-12 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                              placeholder="Mínimo 6 caracteres"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Confirmar Contraseña
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              name="confirmPassword"
                              value={formData.confirmPassword}
                              onChange={handleInputChange}
                              className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                              placeholder="Repite tu contraseña"
                              required
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Step 3: Metas */}
                    {currentStep === 3 && (
                      <>
                        <div className="text-center mb-4">
                          <Target className="w-12 h-12 text-cyan-400 mx-auto mb-2" />
                          <p className="text-slate-400 text-sm">
                            ¿Cuáles son tus 3 metas principales?
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Meta #1
                          </label>
                          <input
                            type="text"
                            name="goal1"
                            value={formData.goal1}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                            placeholder="Tu primera meta..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Meta #2
                          </label>
                          <input
                            type="text"
                            name="goal2"
                            value={formData.goal2}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                            placeholder="Tu segunda meta..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Meta #3
                          </label>
                          <input
                            type="text"
                            name="goal3"
                            value={formData.goal3}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                            placeholder="Tu tercera meta..."
                          />
                        </div>
                      </>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                      {currentStep > 1 && (
                        <button
                          type="button"
                          onClick={() => setCurrentStep(currentStep - 1)}
                          className="flex-1 py-3 px-6 border border-slate-600 text-slate-300 font-medium rounded-xl hover:bg-slate-800 transition-colors"
                        >
                          Atrás
                        </button>
                      )}
                      
                      {currentStep < 3 ? (
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="flex-1 py-3 px-6 bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold rounded-xl hover:scale-[1.02] transition-transform"
                        >
                          Siguiente
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 py-3 px-6 bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Registrando...
                            </>
                          ) : (
                            <>
                              Completar Registro
                              <ArrowRight className="w-5 h-5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Login link */}
                  <p className="text-center text-slate-400 text-sm mt-6">
                    ¿Ya tienes cuenta?{' '}
                    <a href="/login" className="text-cyan-400 hover:underline">
                      Inicia sesión
                    </a>
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video ended overlay - Mostrar CTA final */}
      {videoEnded && !showRegisterModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/80"
        >
          <div className="text-center">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
              ¿Listo para tu
              <span className="block bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                Salto Cuántico?
              </span>
            </h2>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-12 py-5 bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold text-xl rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-violet-500/30"
            >
              COMENZAR MI REGISTRO →
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
