'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Check,
  Loader2,
  Rocket,
  X,
  User,
  Mail,
  Phone,
  Users,
  Sparkles,
  Search
} from 'lucide-react';

interface ExhibitorData {
  id: number;
  nombre: string;
  apellido: string;
  imagen: string | null;
  headline: string | null;
}

interface ReferrerSuggestion {
  id: number;
  nombre: string;
}

// Opciones de parentesco
const RELATIONSHIP_OPTIONS = [
  { value: 'FRIEND', label: '👫 Amigo/a' },
  { value: 'PARENT', label: '👨‍👩‍👧 Padre/Madre' },
  { value: 'SIBLING', label: '👫 Hermano/a' },
  { value: 'SPOUSE', label: '💑 Pareja' },
  { value: 'COLLEAGUE', label: '💼 Colega' },
  { value: 'OTHER', label: '✨ Otro' },
];

export default function ExpoVotePage() {
  const params = useParams();
  const router = useRouter();
  const exhibitorId = params.userId as string;

  // Estados
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Datos del expositor
  const [exhibitor, setExhibitor] = useState<ExhibitorData | null>(null);
  
  // Formulario de registro
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [referrerCode, setReferrerCode] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [searchingReferrer, setSearchingReferrer] = useState(false);
  
  // Sugerencias de referidores
  const [referrerSuggestions, setReferrerSuggestions] = useState<ReferrerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedReferrer, setSelectedReferrer] = useState<ReferrerSuggestion | null>(null);

  // Cargar datos del expositor y verificar registro
  useEffect(() => {
    const init = async () => {
      try {
        // Cargar expositor
        const res = await fetch(`/api/expo/exhibitor/${exhibitorId}`);
        if (!res.ok) throw new Error('Expositor no encontrado');
        const data = await res.json();
        setExhibitor(data.exhibitor);
        
        // Verificar si ya está registrado (token en localStorage)
        const savedToken = localStorage.getItem('expo_visitor_token');
        if (savedToken) {
          // Verificar que el token sea válido
          const verifyRes = await fetch(`/api/expo/visitor/verify?token=${savedToken}`);
          if (verifyRes.ok) {
            // Ya registrado, redirigir a la plataforma de calificaciones
            router.push(`/expo/calificar?exhibitor=${exhibitorId}`);
            return;
          } else {
            // Token inválido, limpiar
            localStorage.removeItem('expo_visitor_token');
          }
        }
      } catch (err) {
        setError('No se pudo cargar la información');
      } finally {
        setLoading(false);
      }
    };
    
    if (exhibitorId) init();
  }, [exhibitorId, router]);

  // Buscar referidor por nombre (solo de la misma visión)
  const searchReferrer = async (name: string) => {
    if (name.length < 2) {
      setReferrerSuggestions([]);
      setShowSuggestions(false);
      setSelectedReferrer(null);
      setReferrerName('');
      return;
    }
    
    setSearchingReferrer(true);
    try {
      // Incluir exhibitorId para filtrar por visión
      const res = await fetch(`/api/expo/search-referrer?q=${encodeURIComponent(name)}&exhibitorId=${exhibitorId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.users && data.users.length > 0) {
          setReferrerSuggestions(data.users);
          setShowSuggestions(true);
          
          // Si solo hay un resultado, seleccionarlo automáticamente
          if (data.users.length === 1) {
            selectReferrer(data.users[0]);
          }
        } else {
          setReferrerSuggestions([]);
          setShowSuggestions(false);
          setSelectedReferrer(null);
          setReferrerName('');
        }
      }
    } catch (err) {
      console.error('Error buscando referidor:', err);
    } finally {
      setSearchingReferrer(false);
    }
  };

  // Seleccionar un referidor de la lista
  const selectReferrer = (referrer: ReferrerSuggestion) => {
    setSelectedReferrer(referrer);
    setReferrerCode(referrer.nombre);
    setReferrerName(referrer.nombre);
    setShowSuggestions(false);
  };

  // Registrar visitante
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!visitorName.trim() || !visitorEmail.trim() || !visitorPhone.trim()) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }
    
    if (!relationship) {
      setError('Por favor selecciona tu relación con quien te invitó');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const res = await fetch('/api/expo/visitor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: visitorName.trim(),
          email: visitorEmail.trim(),
          phone: visitorPhone.trim(),
          referrerName: referrerCode.trim() || null,
          referrerId: selectedReferrer?.id || null,
          relationship: relationship,
          firstExhibitorId: exhibitorId
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrarse');
      }

      // Guardar token en localStorage
      localStorage.setItem('expo_visitor_token', data.token);
      localStorage.setItem('expo_visitor_name', visitorName.trim());
      
      // Celebración
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.4 },
        colors: ['#9333ea', '#ec4899', '#22c55e']
      });

      // Redirigir a la plataforma de calificaciones
      setTimeout(() => {
        router.push(`/expo/calificar?exhibitor=${exhibitorId}`);
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4" />
          <p className="text-purple-300">Cargando...</p>
        </div>
      </div>
    );
  }

  // Error state sin exhibitor
  if (error && !exhibitor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900/80 rounded-3xl p-8 border border-red-500/30 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  // Formulario de registro
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 py-8 px-4">
      <div className="max-w-md mx-auto">
        
        {/* Header con info del expositor */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-6"
        >
          <div className="relative w-24 h-24 mx-auto mb-3">
            <img 
              src={exhibitor?.imagen || '/default-avatar.png'}
              alt={exhibitor?.nombre || 'Expositor'}
              className="w-full h-full rounded-full object-cover border-4 border-purple-500/50 shadow-2xl shadow-purple-500/30"
            />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-white" />
            </div>
          </div>
          
          <h1 className="text-xl font-bold text-white mb-1">
            {exhibitor?.nombre}
          </h1>
          {exhibitor?.headline && (
            <p className="text-purple-300 text-sm">{exhibitor.headline}</p>
          )}
        </motion.div>

        {/* Banner de bienvenida */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-2xl p-4 border border-purple-500/30 mb-6 text-center"
        >
          <Sparkles className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-white mb-1">
            ¡Bienvenido a la Expo de Futuros Imposibles!
          </h2>
          <p className="text-purple-200 text-sm">
            Regístrate para calificar a los expositores
          </p>
        </motion.div>

        {/* Formulario de registro */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleRegister}
          className="bg-slate-900/80 rounded-2xl p-6 border border-slate-700/50 space-y-4"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            Tus datos
          </h3>
          
          {/* Nombre */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Nombre completo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              placeholder="Tu nombre"
              required
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          
          {/* Email */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Correo electrónico <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={visitorEmail}
              onChange={(e) => setVisitorEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          
          {/* Teléfono */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              WhatsApp <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              value={visitorPhone}
              onChange={(e) => setVisitorPhone(e.target.value)}
              placeholder="+52 81 1234 5678"
              required
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <hr className="border-slate-700" />

          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            ¿Quién te invitó?
          </h3>
          
          {/* Código/Nombre de referidor */}
          <div className="relative">
            <label className="block text-sm text-slate-400 mb-2">
              Nombre del participante que te invitó
            </label>
            <div className="relative">
              <input
                type="text"
                value={referrerCode}
                onChange={(e) => {
                  setReferrerCode(e.target.value);
                  setSelectedReferrer(null);
                  searchReferrer(e.target.value);
                }}
                onFocus={() => {
                  if (referrerSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Buscar por nombre..."
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none pr-10"
              />
              {searchingReferrer ? (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
              ) : (
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              )}
            </div>
            
            {/* Dropdown de sugerencias */}
            {showSuggestions && referrerSuggestions.length > 0 && !selectedReferrer && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute z-50 w-full mt-2 bg-slate-800 rounded-xl border border-slate-600 shadow-xl max-h-48 overflow-y-auto"
              >
                <div className="p-2 border-b border-slate-700 text-xs text-slate-400">
                  {referrerSuggestions.length} participante(s) encontrado(s)
                </div>
                {referrerSuggestions.map((referrer) => (
                  <button
                    key={referrer.id}
                    type="button"
                    onClick={() => selectReferrer(referrer)}
                    className="w-full p-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-3 border-b border-slate-700/50 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-white font-medium">{referrer.nombre}</span>
                  </button>
                ))}
              </motion.div>
            )}
            
            {/* Referidor seleccionado */}
            {selectedReferrer && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <Check className="w-4 h-4" />
                  <span className="font-medium">{selectedReferrer.nombre}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReferrer(null);
                    setReferrerCode('');
                    setReferrerName('');
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
            
            {/* Mensaje cuando no encuentra */}
            {referrerCode.length >= 2 && !searchingReferrer && referrerSuggestions.length === 0 && !selectedReferrer && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-amber-400 text-sm"
              >
                No se encontró ningún participante con ese nombre en esta visión
              </motion.p>
            )}
          </div>
          
          {/* Parentesco */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              ¿Cuál es tu relación? <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RELATIONSHIP_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRelationship(option.value)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    relationship === option.value
                      ? 'bg-emerald-600 text-white border-2 border-emerald-400'
                      : 'bg-slate-800 text-slate-300 border border-slate-600 hover:border-emerald-500/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Botón de registro */}
          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Entrar a Calificar
              </>
            )}
          </motion.button>
          
          <p className="text-xs text-slate-500 text-center">
            Al registrarte aceptas recibir información sobre futuros eventos
          </p>
        </motion.form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-slate-600 text-xs">
            Powered by <span className="text-purple-400">Quantum Talent Scout</span>
          </p>
        </div>
      </div>
    </div>
  );
}
