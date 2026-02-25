'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, Sparkles } from 'lucide-react';

export default function AutoLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu acceso...');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No se proporcionó un token de acceso');
      return;
    }

    validateAndLogin();
  }, [token]);

  const validateAndLogin = async () => {
    try {
      // Validar el token
      const res = await fetch(`/api/auth/auto-login?token=${token}`);
      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMessage(data.error || 'Token inválido');
        return;
      }

      setMessage('¡Bienvenido! Iniciando sesión...');

      // Hacer login con credenciales especiales
      const result = await signIn('credentials', {
        email: data.user.email,
        autoLoginToken: token,
        redirect: false
      });

      if (result?.error) {
        setStatus('error');
        setErrorMessage('Error al iniciar sesión');
        return;
      }

      setStatus('success');
      setMessage('¡Listo! Redirigiendo...');

      // Redirigir según el estado del usuario
      setTimeout(() => {
        if (data.requirePasswordChange) {
          router.push('/cambiar-password?firstLogin=true');
        } else if (!data.profileCompleted || !data.hasApodo) {
          router.push('/dashboard/completar-perfil');
        } else {
          router.push('/dashboard');
        }
      }, 1500);

    } catch (error) {
      console.error('Error in auto-login:', error);
      setStatus('error');
      setErrorMessage('Error de conexión');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center relative z-10">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Quantum Platform</h1>
            <p className="text-slate-400">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">¡Bienvenido! 🎉</h1>
            <p className="text-slate-400">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Error de Acceso</h1>
            <p className="text-red-400 mb-4">{errorMessage}</p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors"
            >
              Ir al Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
