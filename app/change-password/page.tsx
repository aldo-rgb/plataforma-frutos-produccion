'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function ChangePasswordPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    // Si el usuario no necesita cambiar contraseña, redirigir al dashboard
    if (session?.user && !session.user.requirePasswordChange) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    calculatePasswordStrength(newPassword);
  }, [newPassword]);

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (passwordStrength <= 1) return 'Débil';
    if (passwordStrength <= 3) return 'Media';
    return 'Fuerte';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (passwordStrength < 2) {
      setError('La contraseña es demasiado débil. Usa mayúsculas, minúsculas, números y símbolos');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (data.success) {
        // Actualizar la sesión para eliminar requirePasswordChange
        await update({ requirePasswordChange: false });
        // Redirigir al dashboard
        router.push('/dashboard');
      } else {
        setError(data.error || 'Error al cambiar la contraseña');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-4 shadow-lg shadow-purple-500/50">
            <Lock size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Cambio de Contraseña Requerido
          </h1>
          <p className="text-slate-400">
            Por tu seguridad, debes cambiar tu contraseña antes de continuar
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nueva Contraseña */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Nueva Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 pr-12"
                  placeholder="Introduce tu nueva contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              
              {/* Indicador de Fortaleza */}
              {newPassword && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold ${
                      passwordStrength <= 1 ? 'text-red-400' :
                      passwordStrength <= 3 ? 'text-amber-400' :
                      'text-green-400'
                    }`}>
                      {getStrengthText()}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className={`flex items-center gap-2 text-xs ${newPassword.length >= 8 ? 'text-green-400' : 'text-slate-500'}`}>
                      <CheckCircle size={14} />
                      <span>Mínimo 8 caracteres</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${(/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) ? 'text-green-400' : 'text-slate-500'}`}>
                      <CheckCircle size={14} />
                      <span>Mayúsculas y minúsculas</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${/\d/.test(newPassword) ? 'text-green-400' : 'text-slate-500'}`}>
                      <CheckCircle size={14} />
                      <span>Al menos un número</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${/[^a-zA-Z0-9]/.test(newPassword) ? 'text-green-400' : 'text-slate-500'}`}>
                      <CheckCircle size={14} />
                      <span>Un carácter especial (!@#$%)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Confirmar Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 pr-12"
                  placeholder="Confirma tu nueva contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={14} />
                  Las contraseñas no coinciden
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword || passwordStrength < 2}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-xl font-bold transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Cambiando contraseña...</span>
                  </>
                ) : (
                  <>
                    <Lock size={20} />
                    <span>Cambiar Contraseña</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors border border-slate-700"
              >
                Cerrar Sesión
              </button>
            </div>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
            <p className="text-xs text-purple-300 leading-relaxed">
              <strong>Nota:</strong> Esta es tu primera vez iniciando sesión con la contraseña temporal. 
              Por seguridad, debes crear una contraseña única y segura.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
