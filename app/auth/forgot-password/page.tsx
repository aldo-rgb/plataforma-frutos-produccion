'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Error al procesar la solicitud');
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Image 
                src="/logo-quantum.svg" 
                alt="Logo" 
                width={40} 
                height={40}
                className="filter brightness-0 invert"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>

          {!success ? (
            <>
              <h1 className="text-2xl font-bold text-center text-white mb-2">
                Recuperar Contraseña
              </h1>
              <p className="text-slate-400 text-center text-sm mb-6">
                Ingresa tu correo electrónico y te enviaremos una nueva contraseña temporal
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Enviar Nueva Contraseña
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                ¡Correo Enviado!
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Hemos enviado una nueva contraseña temporal a <strong className="text-cyan-400">{email}</strong>. 
                Revisa tu bandeja de entrada y usa esa contraseña para iniciar sesión.
              </p>
              <p className="text-xs text-slate-500 mb-4">
                Si no ves el correo, revisa tu carpeta de spam.
              </p>
            </motion.div>
          )}

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Iniciar Sesión
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Powered by <span className="text-cyan-400">APPSync</span>
        </p>
      </motion.div>
    </div>
  );
}
