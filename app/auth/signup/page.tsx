'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

interface Organization {
  id: number;
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  slug: string;
}

interface NextVision {
  id: number;
  nombre: string;
  startDate: string;
  descripcion: string | null;
  maxParticipantes: number;
  currentParticipantes: number;
}

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgCode = searchParams.get('org');

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [nextVision, setNextVision] = useState<NextVision | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (orgCode) {
      fetchOrganizationData();
    } else {
      setLoading(false);
    }
  }, [orgCode]);

  const fetchOrganizationData = async () => {
    try {
      console.log('🔍 Fetching organization data for code:', orgCode);
      const res = await fetch(`/api/public/organization/${orgCode}`);
      const data = await res.json();
      
      console.log('📦 API Response:', data);

      if (data.success) {
        console.log('✅ Organization:', data.organization);
        console.log('📅 Next Vision:', data.nextVision);
        setOrganization(data.organization);
        setNextVision(data.nextVision);
      } else {
        console.error('❌ API Error:', data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.nombre || !formData.email || !formData.password) {
      setError('Por favor completa todos los campos');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setSubmitting(true);

    try {
      // Registrar usuario
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          email: formData.email,
          password: formData.password,
          organizationCode: orgCode
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Auto login después del registro
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.ok) {
          router.push('/dashboard');
        } else {
          setError('Registro exitoso. Por favor inicia sesión.');
          router.push('/auth/signin');
        }
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo y nombre de la organización */}
        {organization && (
          <div className="text-center">
            {organization.logoUrl ? (
              <img
                src={organization.logoUrl}
                alt={organization.name}
                className="mx-auto h-20 w-auto rounded-lg shadow-lg"
              />
            ) : (
              <div 
                className="mx-auto h-20 w-20 rounded-lg flex items-center justify-center text-white font-bold text-2xl shadow-lg"
                style={{ backgroundColor: organization.brandColor || '#8B5CF6' }}
              >
                {organization.name.charAt(0)}
              </div>
            )}
            <h1 className="mt-6 text-3xl font-black text-white">
              {organization.name}
            </h1>
          </div>
        )}

        {/* Información del próximo básico */}
        {organization && (
          nextVision ? (
            <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-2 border-blue-500/30 rounded-2xl p-6 text-center">
              <div className="text-blue-300 text-sm font-medium mb-2">🎯 Próximo Programa Básico</div>
              <h2 className="text-2xl font-bold text-white mb-2">{nextVision.nombre}</h2>
              <div className="text-3xl font-black text-blue-400 mb-2">
                {new Date(nextVision.startDate).toLocaleDateString('es-MX', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </div>
              {nextVision.descripcion && (
                <p className="text-slate-300 text-sm mb-3">{nextVision.descripcion}</p>
              )}
              <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-1">
                  <span>👥</span>
                  <span>{nextVision.currentParticipantes} / {nextVision.maxParticipantes}</span>
                </div>
                <div className="h-4 w-px bg-slate-600"></div>
                <div className="flex items-center gap-1">
                  <span>📅</span>
                  <span>
                    {Math.ceil((new Date(nextVision.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} días
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-2 border-slate-700/30 rounded-2xl p-6 text-center">
              <div className="text-slate-400 text-sm font-medium mb-2">📅 Próximas Convocatorias</div>
              <h2 className="text-xl font-bold text-white mb-2">Aún no hay fechas programadas</h2>
              <p className="text-slate-400 text-sm">
                Te notificaremos cuando se abran nuevos grupos básicos
              </p>
            </div>
          )
        )}

        {/* Formulario de registro */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Crea tu cuenta</h2>
            <p className="text-slate-400 text-sm">
              Únete y comienza tu transformación
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre completo
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Juan Pérez"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirmar contraseña
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Repite tu contraseña"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold rounded-lg transition-all shadow-lg disabled:cursor-not-allowed"
            >
              {submitting ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              ¿Ya tienes cuenta?{' '}
              <Link href="/auth/signin" className="text-purple-400 hover:text-purple-300 font-medium">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
