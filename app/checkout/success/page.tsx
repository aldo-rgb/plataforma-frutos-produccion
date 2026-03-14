'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Ticket, ArrowRight, Mail, Sparkles, LogIn, Loader2, Clock, CreditCard, QrCode, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

interface TicketData {
  id: number;
  ticketCode: string;
  level: string;
  status: string;
  visionName: string;
  organizationName: string;
  userName: string;
  userEmail: string;
  startDate: string | null;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const email = searchParams.get('email');
  const ticketsCreated = parseInt(searchParams.get('tickets') || '1');
  const isNewRegistration = !!email; // If email is present, it's a new registration
  const type = searchParams.get('type'); // 'anticipo' for anticipo payments
  const checkoutId = searchParams.get('checkoutId');
  
  const [countdown, setCountdown] = useState(10);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);

  // Cargar ticket del usuario recién registrado
  useEffect(() => {
    const fetchTicket = async () => {
      if (isNewRegistration && email) {
        setLoadingTicket(true);
        try {
          const res = await fetch(`/api/public/ticket-by-email?email=${encodeURIComponent(email)}`);
          const data = await res.json();
          if (data.success && data.ticket) {
            setTicketData(data.ticket);
          }
        } catch (err) {
          console.error('Error fetching ticket:', err);
        } finally {
          setLoadingTicket(false);
        }
      }
    };
    fetchTicket();
  }, [isNewRegistration, email]);

  useEffect(() => {
    // Only auto-redirect for existing users (Stripe flow) - not for anticipo or new registrations
    if (!isNewRegistration && type !== 'anticipo') {
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            router.push('/dashboard/my-tickets');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [router, isNewRegistration, type]);

  // Anticipo Payment Success
  if (type === 'anticipo') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full"
        >
          <div className="text-center p-12 bg-slate-800/50 rounded-3xl border border-slate-700">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-yellow-500/50"
            >
              <CheckCircle2 size={48} className="text-white" />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent"
            >
              ¡Anticipo Registrado!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-slate-300 mb-8"
            >
              Tu lugar ha sido reservado 🎉
            </motion.p>

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6 text-left mb-8"
            >
              {/* Anticipo Pagado */}
              <div className="flex items-center gap-4 pb-4 border-b border-slate-700 mb-4">
                <div className="p-3 bg-yellow-500/20 rounded-xl">
                  <CreditCard className="text-yellow-400" size={24} />
                </div>
                <div>
                  <p className="font-bold text-white">Anticipo Pagado</p>
                  <p className="text-sm text-slate-400">
                    Tu lugar está reservado con este pago inicial
                  </p>
                </div>
              </div>

              {/* Próximo Paso */}
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-orange-500/20 rounded-xl">
                  <Clock className="text-orange-400" size={24} />
                </div>
                <div>
                  <p className="font-bold text-white">Completa tu Pago</p>
                  <p className="text-sm text-slate-400">
                    Recuerda completar el pago restante antes del inicio del programa
                  </p>
                </div>
              </div>

              {/* Email Sent */}
              <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-500/20 rounded-xl">
                  <Mail className="text-cyan-400" size={24} />
                </div>
                <div>
                  <p className="font-bold text-white">Confirmación Enviada</p>
                  <p className="text-sm text-slate-400">
                    Revisa tu correo: <span className="text-cyan-400">{email || 'tu email'}</span>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Link href="/login">
                <button className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/30">
                  <LogIn size={20} />
                  Iniciar Sesión
                  <ArrowRight size={20} />
                </button>
              </Link>
            </motion.div>

            {/* Footer Note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6 text-sm text-slate-500"
            >
              ¿Tienes preguntas? Contacta a tu coordinador o escríbenos a soporte@frutos.app
            </motion.p>
          </div>
        </motion.div>
      </div>
    );
  }

  // New Registration Flow (Gift Code)
  if (isNewRegistration) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full"
        >
          <div className="text-center p-6 sm:p-12 bg-slate-800/50 rounded-3xl border border-slate-700">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-2xl shadow-green-500/50"
            >
              <CheckCircle2 size={40} className="text-white" />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent"
            >
              ¡Registro Exitoso!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg sm:text-xl text-slate-300 mb-6"
            >
              Bienvenido!!!! 🎉
            </motion.p>

            {/* Ticket Card with QR */}
            {loadingTicket ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center py-8"
              >
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              </motion.div>
            ) : ticketData ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-cyan-500/30 rounded-2xl p-6 mb-6 relative overflow-hidden"
              >
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
                
                <div className="relative z-10">
                  {/* Ticket Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-cyan-400" />
                      <span className="text-sm font-bold text-cyan-400">TU TICKET DE INGRESO</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      ticketData.level === 'BASIC' ? 'bg-cyan-500/20 text-cyan-300' :
                      ticketData.level === 'ADVANCED' ? 'bg-purple-500/20 text-purple-300' :
                      'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {ticketData.level === 'BASIC' ? 'BÁSICO' : 
                       ticketData.level === 'ADVANCED' ? 'AVANZADO' : 'PL'}
                    </span>
                  </div>

                  {/* QR Code */}
                  <div className="flex justify-center mb-4">
                    <div className="bg-white p-3 rounded-xl shadow-lg">
                      <QRCodeSVG 
                        value={`https://impactocuantico.com/ticket/${ticketData.ticketCode}`}
                        size={140}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                  </div>

                  {/* Ticket Code */}
                  <div className="text-center mb-4">
                    <p className="text-xs text-slate-400 mb-1">CÓDIGO DE TICKET</p>
                    <p className="text-lg font-mono font-bold text-white tracking-wider">
                      {ticketData.ticketCode}
                    </p>
                  </div>

                  {/* Ticket Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs mb-1">Participante</p>
                      <p className="text-white font-medium truncate">{ticketData.userName}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs mb-1">Visión</p>
                      <p className="text-white font-medium truncate">{ticketData.visionName}</p>
                    </div>
                    <div className="col-span-2 bg-slate-800/50 rounded-lg p-3">
                      <p className="text-slate-400 text-xs mb-1">Organización</p>
                      <p className="text-white font-medium">{ticketData.organizationName}</p>
                    </div>
                  </div>

                  {/* Note */}
                  <p className="text-xs text-slate-500 text-center mt-4">
                    Presenta este QR en la entrada del evento
                  </p>
                </div>
              </motion.div>
            ) : (
              /* Fallback: Info Card sin ticket */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6 text-left mb-6"
              >
                {/* Tickets Created */}
                <div className="flex items-center gap-4 pb-4 border-b border-slate-700 mb-4">
                  <div className="p-3 bg-yellow-500/20 rounded-xl">
                    <Ticket className="text-yellow-400" size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-white">
                      {ticketsCreated} Ticket{ticketsCreated > 1 ? 's' : ''} Activado{ticketsCreated > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-slate-400">
                      {ticketsCreated === 1 
                        ? 'Acceso a nivel Básico' 
                        : 'Acceso a todos los niveles (Básico, Avanzado, PL)'}
                    </p>
                  </div>
                </div>

                {/* Email Sent */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-cyan-500/20 rounded-xl">
                    <Mail className="text-cyan-400" size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-white">Confirmación Enviada</p>
                    <p className="text-sm text-slate-400">
                      Revisa tu correo: <span className="text-cyan-400">{email}</span>
                    </p>
                  </div>
                </div>

                {/* Start Journey */}
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-xl">
                    <Sparkles className="text-purple-400" size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-white">Tu Aventura Comienza</p>
                    <p className="text-sm text-slate-400">
                      Inicia sesión para comenzar tu transformación
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Email confirmation note */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="flex items-center justify-center gap-2 text-sm text-slate-400 mb-6"
            >
              <Mail size={16} />
              <span>También enviamos el ticket a: <span className="text-cyan-400">{email}</span></span>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Link href={`/login?email=${encodeURIComponent(email || '')}&newUser=true`}>
                <button className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30">
                  <LogIn size={20} />
                  Iniciar Sesión
                  <ArrowRight size={20} />
                </button>
              </Link>
            </motion.div>

            {/* Footer Note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6 text-sm text-slate-500"
            >
              ¿Tienes problemas? Contacta a tu administrador o escríbenos a soporte@frutos.app
            </motion.p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Existing User Flow (Stripe Purchase)
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full"
      >
        <div className="text-center p-12 bg-slate-800/50 rounded-3xl border border-slate-700">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-2xl shadow-green-500/50"
          >
            <CheckCircle2 size={48} className="text-white" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent"
          >
            ¡Pago Exitoso!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-slate-300 mb-8"
          >
            Tu ticket ha sido generado correctamente
          </motion.p>

          {/* Info Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-6 bg-slate-900/50 rounded-xl mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Ticket size={24} className="text-cyan-400" />
              <span className="text-lg font-medium">Ticket Generado</span>
            </div>
            <p className="text-slate-400 text-sm">
              Recibirás un email de confirmación con todos los detalles de tu ticket.
              Podrás verlo en tu wallet y transferirlo si lo necesitas.
            </p>
          </motion.div>

          {/* Session ID */}
          {sessionId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs text-slate-500 mb-6"
            >
              ID de Sesión: {sessionId}
            </motion.div>
          )}

          {/* Redirect Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-2 text-cyan-400 mb-6"
          >
            <span>Redirigiendo a tu wallet en {countdown}s</span>
            <ArrowRight size={20} className="animate-pulse" />
          </motion.div>

          {/* Manual Button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={() => router.push('/dashboard/my-tickets')}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 font-bold transition-all shadow-lg shadow-cyan-500/20"
          >
            Ir a Mi Wallet Ahora
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
