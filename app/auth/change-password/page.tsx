'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';

function ChangePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const isMagicLink = searchParams.get('magic') === 'true';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validaciones en tiempo real
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const isValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && passwordsMatch;

  useEffect(() => {
    // Si no es magic link y no hay sesión, redirigir a login
    if (!isMagicLink && status === 'unauthenticated') {
      router.push('/login');
    }

    // Si ya completó el cambio, redirigir directo al dashboard
    if (session?.user && !session.user.requirePasswordChange) {
      router.push('/dashboard');
    }
  }, [session, status, isMagicLink, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) {
      setError('Por favor cumple todos los requisitos de la contraseña');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          newPassword: password,
          isMagicLink 
        }),
        credentials: 'include' // Importante para cookies
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar contraseña');
      }

      setSuccess(true);

      // Esperar 2 segundos y hacer login automático
      setTimeout(async () => {
        if (data.email) {
          // Login automático con nueva contraseña
          const result = await signIn('credentials', {
            email: data.email,
            password: password,
            redirect: false
          });

          if (result?.ok) {
            // Redirigir directo al dashboard
            router.push('/dashboard');
          } else {
            // Si falla el auto-login, ir a login manual
            router.push('/login?message=password_changed');
          }
        } else {
          router.push('/login?message=password_changed');
        }
      }, 2000);

    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl mb-6 shadow-lg shadow-purple-500/50">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            {isMagicLink ? '¡Bienvenido a Quantum!' : 'Asegura tu Cuenta'}
          </h1>
          <p className="text-slate-400">
            {isMagicLink 
              ? 'Crea tu contraseña definitiva para continuar'
              : 'Por seguridad, actualiza tu contraseña temporal'
            }
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                ¡Contraseña Actualizada!
              </h2>
              <p className="text-slate-400 mb-4">
                Redirigiendo a tu experiencia...
              </p>
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nueva Contraseña */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-500" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg py-3 pl-10 pr-12 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    placeholder="Mínimo 8 caracteres"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirmar Contraseña */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-500" size={20} />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg py-3 pl-10 pr-12 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    placeholder="Repite tu contraseña"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-300"
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Requisitos */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-3">
                  Requisitos de Seguridad:
                </p>
                <div className="space-y-2 text-sm">
                  <div className={`flex items-center gap-2 ${hasMinLength ? 'text-green-400' : 'text-slate-500'}`}>
                    <CheckCircle size={16} />
                    <span>Mínimo 8 caracteres</span>
                  </div>
                  <div className={`flex items-center gap-2 ${hasUpperCase ? 'text-green-400' : 'text-slate-500'}`}>
                    <CheckCircle size={16} />
                    <span>Al menos una mayúscula</span>
                  </div>
                  <div className={`flex items-center gap-2 ${hasLowerCase ? 'text-green-400' : 'text-slate-500'}`}>
                    <CheckCircle size={16} />
                    <span>Al menos una minúscula</span>
                  </div>
                  <div className={`flex items-center gap-2 ${hasNumber ? 'text-green-400' : 'text-slate-500'}`}>
                    <CheckCircle size={16} />
                    <span>Al menos un número</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordsMatch ? 'text-green-400' : 'text-slate-500'}`}>
                    <CheckCircle size={16} />
                    <span>Las contraseñas coinciden</span>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Botón Submit */}
              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all shadow-lg shadow-purple-500/30 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Shield size={20} />
                    <span>Establecer Contraseña</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <p className="text-center text-xs text-slate-500 mt-6">
            Al establecer tu contraseña, aceptas nuestros términos de servicio y política de privacidad.
          </p>
        )}
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>
      </div>
    }>
      <ChangePasswordContent />
    </Suspense>
  );
}
