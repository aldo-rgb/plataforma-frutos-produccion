'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { LogIn, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface OrgBranding {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string | null;
  loginBackgroundUrl: string | null;
  loginWelcomeMessage: string | null;
  showPoweredBy: boolean;
}

export default function OrgLoginPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState<OrgBranding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchBranding();
    }
  }, [slug]);

  const fetchBranding = async () => {
    try {
      const res = await fetch(`/api/org/${slug}/branding`);
      const data = await res.json();

      if (data.success) {
        setBranding(data.organization);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error('Error fetching branding:', err);
      setError('Error al cargar la página');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setSubmitting(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        setLoginError('Credenciales incorrectas. Verifica tu correo y contraseña.');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setLoginError('Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (notFound || !branding) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Página no disponible</h1>
          <p className="text-slate-400 mb-6">
            Esta organización no tiene un portal de login personalizado activo.
          </p>
          <a
            href="/auth/signin"
            className="inline-block px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Ir al Login Principal
          </a>
        </div>
      </div>
    );
  }

  const primaryColor = branding.brandColor || '#6366f1';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: branding.loginBackgroundUrl
          ? `url(${branding.loginBackgroundUrl})`
          : 'linear-gradient(to bottom right, #1e293b, #0f172a)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="w-full max-w-md">
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-slate-700">
          {/* Logo */}
          <div className="text-center mb-8">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.name}
                className="h-16 w-auto mx-auto mb-4 object-contain"
              />
            ) : (
              <div
                className="h-16 w-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: primaryColor + '20' }}
              >
                <span className="text-3xl">🏫</span>
              </div>
            )}
            <h1 className="text-2xl font-bold text-white">
              {branding.loginWelcomeMessage || `Bienvenido a ${branding.name}`}
            </h1>
            <p className="text-slate-400 mt-2">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Login Error */}
          {loginError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
              <AlertCircle size={20} />
              <span className="text-sm">{loginError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@correo.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          {/* Forgot Password */}
          <div className="mt-6 text-center">
            <a
              href="/auth/forgot-password"
              className="text-sm text-slate-400 hover:text-purple-400 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {/* Powered By */}
          {branding.showPoweredBy && (
            <div className="mt-8 pt-6 border-t border-slate-700 text-center">
              <p className="text-slate-500 text-xs">
                Powered by{' '}
                <a href="/" className="text-purple-400 hover:text-purple-300 transition-colors">
                  AppSync
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
