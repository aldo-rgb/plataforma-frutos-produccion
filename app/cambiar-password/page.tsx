'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, AlertTriangle, CheckCircle, Loader2, Sparkles } from 'lucide-react';

export default function CambiarPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const isFirstLogin = searchParams.get('firstLogin') === 'true';
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [redirectingToProfile, setRedirectingToProfile] = useState(false);

  // Redirigir al login si no está autenticado
  if (status === 'unauthenticated') {
    router.push('/login');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      setLoading(false);
      return;
    }

    // Validar longitud mínima
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al cambiar la contraseña');
        setLoading(false);
        return;
      }

      setSuccess(true);
      
      // Si es primer login, SIEMPRE redirigir a completar perfil
      if (isFirstLogin) {
        setRedirectingToProfile(true);
        setTimeout(() => {
          router.push('/dashboard/completar-perfil');
        }, 2000);
        return;
      }
      
      // Para cambios de contraseña normales, verificar si el perfil está completo
      try {
        const profileRes = await fetch('/api/user/profile');
        const profileData = await profileRes.json();
        
        // Si el perfil no está completo, redirigir a completar-perfil
        if (profileData.user && !profileData.user.profileCompleted && !profileData.user.apodo) {
          setRedirectingToProfile(true);
          setTimeout(() => {
            router.push('/dashboard/completar-perfil');
          }, 2000);
          return;
        }
      } catch (e) {
        // Si hay error, redirigir al dashboard normal
        console.error('Error checking profile:', e);
      }
      
      // Redirigir al dashboard si el perfil ya está completo
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (error) {
      setError('Error inesperado. Por favor intenta de nuevo.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-500" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">¡Contraseña Actualizada!</h2>
          <p className="text-slate-400">
            {redirectingToProfile 
              ? 'Redirigiendo a completar tu perfil...' 
              : 'Redirigiendo al dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          {isFirstLogin ? (
            <>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-white" size={32} />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                ¡Bienvenido! 🎉
              </h1>
              <p className="text-slate-400">Solo un paso más: crea tu contraseña personal</p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                Cambio de Contraseña
              </h1>
              <p className="text-slate-400">Por seguridad, debes cambiar tu contraseña temporal</p>
            </>
          )}
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {/* Mensaje informativo */}
          {isFirstLogin ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-green-200">
                <p className="font-semibold mb-1">Tu cuenta está lista</p>
                <p className="text-green-300/80">
                  Tu contraseña temporal es <strong className="text-yellow-300">Quantum123</strong>. Cámbiala por una personal para mayor seguridad.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-yellow-200">
                <p className="font-semibold mb-1">Contraseña Temporal Detectada</p>
                <p className="text-yellow-300/80">
                  Tu cuenta fue creada con una contraseña temporal. Por favor, cámbiala ahora para continuar.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Contraseña Actual */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Contraseña Actual (Temporal)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <input
                  type={showCurrent ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-12 text-slate-100 focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all"
                  placeholder="Ingresa la contraseña temporal"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Nueva Contraseña */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Nueva Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <input
                  type={showNew ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-12 text-slate-100 focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirmar Nueva Contraseña */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Confirmar Nueva Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-12 text-slate-100 focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all"
                  placeholder="Repite la nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Cambiar Contraseña
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-8">
          © 2024 QUANTUM. Sistema seguro de gestión de contraseñas.
        </p>
      </div>
    </div>
  );
}
