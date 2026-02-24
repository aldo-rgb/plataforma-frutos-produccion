'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, User, Clock, Users, Target, Sparkles } from 'lucide-react';

export default function CompletarPerfilPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    apodo: '',
    horarioLlamada: '',
    children: '0',
    goal1: '',
    goal2: '',
    goal3: '',
    expectations: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      // Verificar si el usuario ya completó su perfil
      checkProfileStatus();
    }
  }, [status]);

  const checkProfileStatus = async () => {
    try {
      const res = await fetch('/api/user/me');
      const data = await res.json();
      
      if (data.success && data.user) {
        // Si ya tiene apodo, ya completó el perfil
        if (data.user.apodo && data.user.apodo !== '') {
          router.push('/dashboard');
          return;
        }
        // Pre-llenar con datos existentes
        setFormData(prev => ({
          ...prev,
          apodo: data.user.apodo || '',
          horarioLlamada: data.user.horarioLlamada || '',
          children: data.user.children?.toString() || '0',
        }));
      }
      setLoading(false);
    } catch (e) {
      console.error('Error checking profile:', e);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.apodo.trim()) {
      setError('Por favor ingresa cómo te gusta que te digan');
      return;
    }
    if (!formData.horarioLlamada) {
      setError('Por favor selecciona tu horario preferido de contacto');
      return;
    }
    if (!formData.goal1.trim()) {
      setError('Por favor ingresa al menos una meta');
      return;
    }
    if (!formData.expectations.trim()) {
      setError('Por favor cuéntanos qué esperas del entrenamiento');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apodo: formData.apodo,
          horarioLlamada: formData.horarioLlamada,
          children: parseInt(formData.children) || 0,
          goals: [formData.goal1, formData.goal2, formData.goal3].filter(Boolean),
          expectations: formData.expectations,
          profileCompleted: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar el perfil');
      }

      setSuccess(true);
      
      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (e: any) {
      setError(e.message || 'Error al guardar el perfil');
      setSubmitting(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-400" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">¡Perfil Completado!</h1>
          <p className="text-slate-400">Redirigiendo al dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-40 w-96 h-96 bg-cyan-500 opacity-5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-20 -left-40 w-96 h-96 bg-purple-500 opacity-5 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-cyan-400" size={32} />
          </div>
          <h1 className="text-3xl font-bold mb-2">Completa tu Perfil</h1>
          <p className="text-slate-400">Solo un paso más para comenzar tu transformación</p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="bg-slate-900/50 backdrop-blur-md border border-slate-800/50 rounded-2xl p-8 space-y-6"
        >
          {/* Apodo */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <User size={16} className="text-cyan-400" />
              ¿Cómo te gusta que te digan? <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              value={formData.apodo}
              onChange={(e) => setFormData(prev => ({ ...prev, apodo: e.target.value }))}
              placeholder="Juan, Juanito, JD..."
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              required
            />
          </div>

          {/* Horario de contacto */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
              <Clock size={16} className="text-cyan-400" />
              Horario preferido de contacto <span className="text-cyan-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: '5am-10am', label: '🌅 5am - 10am' },
                { value: '10am-3pm', label: '☀️ 10am - 3pm' },
                { value: '3pm-7pm', label: '🌤️ 3pm - 7pm' },
                { value: '7pm-10pm', label: '🌙 7pm - 10pm' },
              ].map((slot) => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, horarioLlamada: slot.value }))}
                  className={`px-4 py-3 rounded-lg border-2 transition-all font-medium ${
                    formData.horarioLlamada === slot.value
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                      : 'border-slate-700/50 bg-slate-800/30 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>

          {/* Número de hijos */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Users size={16} className="text-cyan-400" />
              Número de hijos
            </label>
            <input
              type="number"
              min="0"
              value={formData.children}
              onChange={(e) => setFormData(prev => ({ ...prev, children: e.target.value }))}
              placeholder="0"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
            />
          </div>

          {/* Metas */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Target size={16} className="text-cyan-400" />
              ¿Qué metas quieres lograr? <span className="text-cyan-400">*</span>
            </label>
            <div className="space-y-3">
              <textarea
                value={formData.goal1}
                onChange={(e) => setFormData(prev => ({ ...prev, goal1: e.target.value }))}
                placeholder="Meta principal..."
                rows={2}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all resize-none"
                required
              />
              <textarea
                value={formData.goal2}
                onChange={(e) => setFormData(prev => ({ ...prev, goal2: e.target.value }))}
                placeholder="Segunda meta (opcional)..."
                rows={2}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all resize-none"
              />
              <textarea
                value={formData.goal3}
                onChange={(e) => setFormData(prev => ({ ...prev, goal3: e.target.value }))}
                placeholder="Tercera meta (opcional)..."
                rows={2}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all resize-none"
              />
            </div>
          </div>

          {/* Expectativas */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Sparkles size={16} className="text-cyan-400" />
              ¿Qué esperas del entrenamiento? <span className="text-cyan-400">*</span>
            </label>
            <textarea
              value={formData.expectations}
              onChange={(e) => setFormData(prev => ({ ...prev, expectations: e.target.value }))}
              placeholder="Cuéntanos qué esperas obtener de esta experiencia..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all resize-none"
              required
            />
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                Completar Perfil
              </>
            )}
          </button>
        </motion.form>
      </div>
    </div>
  );
}
