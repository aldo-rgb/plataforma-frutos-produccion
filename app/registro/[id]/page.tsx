'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, UserPlus, Search, User, LogIn, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Vision {
  id: number;
  nombre: string;
  descripcion: string | null;
  maxParticipantes: number | null;
  currentParticipants: number;
  availableSlots: number;
  organization?: {
    id: number;
    name: string;
    logoUrl: string | null;
  };
}

interface AngelSuggestion {
  id: number;
  nombre: string;
  email: string;
}

// Tipo de modo de registro
type RegistroMode = 'new' | 'existing';

export default function RegistroPublicoPage() {
  const router = useRouter();
  const params = useParams();
  const visionId = params?.id as string;

  const [vision, setVision] = useState<Vision | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Modo de registro: 'new' = nuevo usuario, 'existing' = ya tiene cuenta
  const [registroMode, setRegistroMode] = useState<RegistroMode>('new');
  const [existingEmail, setExistingEmail] = useState('');
  const [joinedUserName, setJoinedUserName] = useState('');

  // Nuevos estados para ángel de enrolamiento
  const [searchingAngel, setSearchingAngel] = useState(false);
  const [angelSuggestions, setAngelSuggestions] = useState<AngelSuggestion[]>([]);
  const [selectedAngel, setSelectedAngel] = useState<AngelSuggestion | null>(null);
  const [showAngelSuggestions, setShowAngelSuggestions] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    emailConfirmacion: '',
    telefono: '',
    password: '',
    confirmPassword: '',
    visionGraduacion: '', // Número de visión en la que se graduó
    angelEnrolamiento: '' // Nombre del ángel de enrolamiento
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchVisionInfo();
  }, [visionId]);

  // Buscar ángeles cuando se escribe en el campo
  useEffect(() => {
    const searchAngel = async () => {
      if (formData.angelEnrolamiento.length < 3) {
        setAngelSuggestions([]);
        setShowAngelSuggestions(false);
        return;
      }

      setSearchingAngel(true);
      try {
        const res = await fetch(`/api/registro/search-angel?q=${encodeURIComponent(formData.angelEnrolamiento)}`);
        const data = await res.json();
        if (data.success && data.usuarios) {
          setAngelSuggestions(data.usuarios);
          setShowAngelSuggestions(data.usuarios.length > 0);
        }
      } catch (error) {
        console.error('Error buscando ángel:', error);
      } finally {
        setSearchingAngel(false);
      }
    };

    const debounce = setTimeout(searchAngel, 300);
    return () => clearTimeout(debounce);
  }, [formData.angelEnrolamiento]);

  const selectAngel = (angel: AngelSuggestion) => {
    setSelectedAngel(angel);
    setFormData({ ...formData, angelEnrolamiento: angel.nombre });
    setShowAngelSuggestions(false);
  };

  const clearSelectedAngel = () => {
    setSelectedAngel(null);
    setFormData({ ...formData, angelEnrolamiento: '' });
  };

  const fetchVisionInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/registro/${visionId}/info`);
      const data = await res.json();

      if (data.success) {
        setVision(data.vision);
      } else {
        setError(data.error || 'Error al cargar información de la visión');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El correo es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Correo electrónico inválido';
    }

    if (!formData.emailConfirmacion.trim()) {
      newErrors.emailConfirmacion = 'La confirmación del correo es obligatoria';
    } else if (formData.email !== formData.emailConfirmacion) {
      newErrors.emailConfirmacion = 'Los correos electrónicos no coinciden';
    }

    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es obligatorio';
    } else if (!/^[\d\s\+\-()]+$/.test(formData.telefono)) {
      newErrors.telefono = 'Formato de teléfono inválido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const res = await fetch(`/api/registro/${visionId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          email: formData.email,
          telefono: formData.telefono,
          password: formData.password,
          // Nuevos campos para usuarios del sistema viejo
          visionGraduacion: formData.visionGraduacion || null,
          angelEnrolamientoId: selectedAngel?.id || null, // ID si se encontró
          angelEnrolamientoNombre: formData.angelEnrolamiento || null // Nombre (para enlace posterior)
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMessage(`Tu cuenta ha sido creada exitosamente y has sido asignado a ${vision?.nombre}`);
        setSuccess(true);
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.error || 'Error al registrar usuario');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al procesar el registro');
    } finally {
      setSubmitting(false);
    }
  };

  // Nueva función: unirse a liderato con cuenta existente
  const handleJoinExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!existingEmail.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(existingEmail)) {
      setError('Formato de correo electrónico inválido');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const res = await fetch(`/api/registro/${visionId}/join-existing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: existingEmail.toLowerCase().trim()
        }),
      });

      const data = await res.json();

      if (data.success) {
        setJoinedUserName(data.userName || '');
        setSuccessMessage(data.message || `Te has unido exitosamente a ${vision?.nombre}`);
        setSuccess(true);
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        if (data.code === 'USER_NOT_FOUND') {
          setError('No existe una cuenta con este correo. ¿Quieres crear una cuenta nueva?');
        } else if (data.code === 'ALREADY_ENROLLED') {
          setError('Ya estás inscrito en este liderato. Puedes iniciar sesión directamente.');
        } else {
          setError(data.error || 'Error al unirse al liderato');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al procesar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <LoadingSpinner message="Cargando registro..." size="lg" />
      </div>
    );
  }

  if (error && !vision) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-900/80 backdrop-blur border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="text-red-400 w-16 h-16 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-slate-300 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-900/80 backdrop-blur border border-emerald-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="text-emerald-400 w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            {registroMode === 'existing' ? '¡Te has unido exitosamente!' : '¡Registro Exitoso!'}
          </h2>
          <p className="text-slate-300 mb-4">
            {successMessage}
          </p>
          {registroMode === 'new' && (
            <p className="text-slate-400 text-sm mb-4">
              Se te ha asignado una licencia en estado "Pendiente". Tu coordinador activará tu acceso pronto.
            </p>
          )}
          {registroMode === 'existing' && joinedUserName && (
            <p className="text-slate-400 text-sm mb-4">
              Bienvenido de nuevo, <strong className="text-purple-400">{joinedUserName}</strong>. Ya puedes iniciar sesión.
            </p>
          )}
          <p className="text-purple-400 text-sm">
            Serás redirigido al inicio de sesión en unos segundos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur border border-purple-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-8">
          {vision?.organization?.logoUrl ? (
            <div className="flex items-center justify-center mb-4">
              <img 
                src={vision.organization.logoUrl} 
                alt={vision.organization.name}
                className="h-16 w-auto object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-16 h-16 bg-purple-600/20 rounded-full mx-auto mb-4">
              <UserPlus className="text-purple-400" size={32} />
            </div>
          )}
          <h1 className="text-3xl font-bold text-white mb-2">Registro</h1>
          {vision?.organization && (
            <p className="text-slate-400 text-sm mb-1">
              {vision.organization.name}
            </p>
          )}
          <p className="text-slate-300">
            Únete a <strong className="text-purple-400">{vision?.nombre}</strong>
          </p>
        </div>

        {vision && vision.availableSlots !== null && vision.availableSlots <= 0 && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-300 text-sm text-center">
              <strong>Límite alcanzado.</strong> No hay cupos disponibles en este momento.
            </p>
          </div>
        )}

        {/* Tabs para cambiar entre modo nuevo y existente */}
        <div className="flex mb-6 bg-slate-800/50 rounded-xl p-1">
          <button
            type="button"
            onClick={() => { setRegistroMode('new'); setError(''); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              registroMode === 'new' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus size={16} />
            Nuevo Usuario
          </button>
          <button
            type="button"
            onClick={() => { setRegistroMode('existing'); setError(''); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              registroMode === 'existing' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn size={16} />
            Ya Tengo Cuenta
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-300 text-sm">{error}</p>
            {error.includes('No existe una cuenta') && (
              <button
                type="button"
                onClick={() => { setRegistroMode('new'); setError(''); }}
                className="mt-2 text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1"
              >
                <ArrowLeft size={14} />
                Crear cuenta nueva
              </button>
            )}
            {error.includes('Ya estás inscrito') && (
              <a
                href="/login"
                className="mt-2 text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1"
              >
                <LogIn size={14} />
                Ir a iniciar sesión
              </a>
            )}
          </div>
        )}

        {/* MODO: Usuario existente - Solo pide email */}
        {registroMode === 'existing' && (
          <form onSubmit={handleJoinExisting} className="space-y-6">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
              <p className="text-blue-300 text-sm text-center">
                💡 Si ya tienes una cuenta, ingresa tu correo para unirte a este liderato sin crear una cuenta nueva.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Correo electrónico de tu cuenta <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={existingEmail}
                onChange={(e) => setExistingEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || Boolean(vision && vision.availableSlots !== null && vision.availableSlots <= 0)}
              className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 disabled:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Unirme a {vision?.nombre}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* MODO: Nuevo usuario - Formulario completo */}
        {registroMode === 'new' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nombre completo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Juan Pérez"
              className={`w-full px-4 py-3 bg-slate-800 border ${errors.nombre ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20`}
            />
            {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Correo electrónico <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="tu@email.com"
              className={`w-full px-4 py-3 bg-slate-800 border ${errors.email ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20`}
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Confirmar correo electrónico <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={formData.emailConfirmacion}
              onChange={(e) => setFormData({ ...formData, emailConfirmacion: e.target.value })}
              placeholder="Repite tu correo"
              className={`w-full px-4 py-3 bg-slate-800 border ${errors.emailConfirmacion ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20`}
            />
            {errors.emailConfirmacion && <p className="text-red-400 text-xs mt-1">{errors.emailConfirmacion}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Teléfono (WhatsApp) <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="+52 55 1234 5678"
              className={`w-full px-4 py-3 bg-slate-800 border ${errors.telefono ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20`}
            />
            {errors.telefono && <p className="text-red-400 text-xs mt-1">{errors.telefono}</p>}
          </div>

          {/* Campos opcionales para usuarios del sistema viejo */}
          <div className="pt-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 mb-4">
              📋 <strong>Opcional:</strong> Si vienes de una visión anterior, completa estos campos
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Número de Visión donde te graduaste
              </label>
              <input
                type="text"
                value={formData.visionGraduacion}
                onChange={(e) => setFormData({ ...formData, visionGraduacion: e.target.value })}
                placeholder="Ej: Visión 15, V-23, etc."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre de Referencia
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.angelEnrolamiento}
                  onChange={(e) => {
                    setFormData({ ...formData, angelEnrolamiento: e.target.value });
                    if (selectedAngel) setSelectedAngel(null);
                  }}
                  placeholder="Escribe el nombre de quien te invitó..."
                  className={`w-full px-4 py-3 bg-slate-800 border ${selectedAngel ? 'border-emerald-500' : 'border-slate-600'} rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 pr-12`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {searchingAngel ? (
                    <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                  ) : selectedAngel ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Search className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
              
              {/* Sugerencias de ángeles */}
              {showAngelSuggestions && angelSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {angelSuggestions.map((angel) => (
                    <button
                      key={angel.id}
                      type="button"
                      onClick={() => selectAngel(angel)}
                      className="w-full px-4 py-3 text-left hover:bg-purple-600/20 transition-colors flex items-center gap-3 border-b border-slate-700 last:border-b-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center">
                        <User className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{angel.nombre}</p>
                        <p className="text-slate-400 text-xs">{angel.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {selectedAngel && (
                <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Ángel encontrado: {selectedAngel.nombre}
                </p>
              )}
              
              {formData.angelEnrolamiento && !selectedAngel && formData.angelEnrolamiento.length >= 3 && !searchingAngel && (
                <p className="text-amber-400 text-xs mt-2">
                  ⚠️ No encontrado. Se guardará el nombre para enlazar cuando se registre.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Contraseña <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                className={`w-full px-4 py-3 bg-slate-800 border ${errors.password ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Confirmar contraseña <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Repite tu contraseña"
                className={`w-full px-4 py-3 bg-slate-800 border ${errors.confirmPassword ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || Boolean(vision && vision.availableSlots !== null && vision.availableSlots <= 0)}
              className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 disabled:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  <span>Crear Cuenta</span>
                </>
              )}
            </button>
          </div>
        </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            ¿Prefieres ir directo al login?{' '}
            <a href="/login" className="text-purple-400 hover:text-purple-300 font-semibold">
              Inicia sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
