'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, Calendar, MapPin, Mail, ArrowRight, PartyPopper, Ticket, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

export default function EventSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const productId = params.productId as string;
  const sessionId = searchParams.get('session_id');
  const registrationId = searchParams.get('registration_id');
  
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [eventData, setEventData] = useState<{
    eventName: string;
    userName: string;
    userEmail: string;
    startDate: string | null;
    location: string | null;
    ticketCode?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const res = await fetch(`/api/public/evento/${productId}/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          registrationId,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSuccess(true);
        setEventData(data.data);
        
        // Lanzar confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        setError(data.error || 'Error al verificar el pago');
      }
    } catch (err) {
      setError('Error al verificar el pago');
    } finally {
      setLoading(false);
    }
  };

  const copyTicketCode = async () => {
    if (eventData?.ticketCode) {
      await navigator.clipboard.writeText(eventData.ticketCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Verificando tu pago...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/80 border border-red-500/30 rounded-3xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Error en el pago</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link
            href={`/evento/${productId}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Volver al evento
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900/80 border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-10 h-10 text-white" />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <PartyPopper className="w-8 h-8 text-yellow-400" />
            ¡Pago Exitoso!
          </h1>
          <p className="text-slate-400 mb-6">Tu lugar está confirmado</p>
        </motion.div>

        {/* Ticket Code - Prominente */}
        {eventData?.ticketCode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 rounded-2xl p-5 mb-6"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Ticket className="w-6 h-6 text-amber-400" />
              <span className="text-amber-400 font-semibold text-sm uppercase tracking-wider">Tu Ticket de Entrada</span>
            </div>
            <div className="bg-slate-900/80 rounded-xl p-4 flex items-center justify-between gap-3">
              <code className="text-xl md:text-2xl font-mono font-bold text-white tracking-wider">
                {eventData.ticketCode}
              </code>
              <button
                onClick={copyTicketCode}
                className="p-2 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors flex-shrink-0"
                title="Copiar código"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5 text-amber-400" />
                )}
              </button>
            </div>
            <p className="text-amber-300/70 text-xs mt-3 text-center">
              Guarda este código. Lo necesitarás para entrar al evento.
            </p>
          </motion.div>
        )}

        {/* Event Details */}
        {eventData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800/50 rounded-xl p-4 mb-6 text-left space-y-3"
          >
            <h2 className="font-semibold text-white text-lg">{eventData.eventName}</h2>
            
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Mail className="w-4 h-4" />
              <span>{eventData.userEmail}</span>
            </div>
            
            {eventData.startDate && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Calendar className="w-4 h-4" />
                <span>{new Date(eventData.startDate).toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}</span>
              </div>
            )}
            
            {eventData.location && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <MapPin className="w-4 h-4" />
                <span>{eventData.location}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-slate-500 text-sm mb-6"
        >
          Te hemos enviado un correo con los detalles de tu registro y las instrucciones para el evento.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-cyan-500 to-violet-500 text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Inicia sesión en tu cuenta
            <ArrowRight className="w-5 h-5" />
          </Link>
          
          <Link
            href={`/evento/${productId}`}
            className="w-full inline-flex items-center justify-center px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-colors"
          >
            Volver al evento
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
