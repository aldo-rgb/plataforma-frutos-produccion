'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';
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

export default function RegistroPublicoPage() {
  const router = useRouter();
  const params = useParams();
  const visionId = params?.id as string;

  const [vision, setVision] = useState<Vision | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    emailConfirmacion: '',
    telefono: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchVisionInfo();
  }, [visionId]);

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
          password: formData.password
        }),
      });

      const data = await res.json();

      if (data.success) {
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
          <h2 className="text-2xl font-bold text-white mb-2">¡Registro Exitoso!</h2>
          <p className="text-slate-300 mb-4">
            Tu cuenta ha sido creada exitosamente y has sido asignado a <strong>{vision?.nombre}</strong>
          </p>
          <p className="text-slate-400 text-sm mb-4">
            Se te ha asignado una licencia en estado "Pendiente". Tu coordinador activará tu acceso pronto.
          </p>
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

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

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

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="text-purple-400 hover:text-purple-300 font-semibold">
              Inicia sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
