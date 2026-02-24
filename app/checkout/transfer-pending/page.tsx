'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle,
  Copy,
  MessageCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

function TransferPendingContent() {
  const searchParams = useSearchParams();
  const orderRef = searchParams.get('ref') || '';
  const email = searchParams.get('email') || '';
  const amount = searchParams.get('amount') || '0';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  // Datos bancarios - estos deberían venir de configuración
  const bankInfo = {
    banco: 'BBVA',
    clabe: '012180001234567890',
    beneficiario: 'QUANTUM MATTER SA DE CV',
    referencia: orderRef,
    whatsapp: '+52 81 1234 5678',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-40 w-96 h-96 bg-purple-500 opacity-5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-20 -left-40 w-96 h-96 bg-cyan-500 opacity-5 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="text-purple-400" size={40} />
          </div>
          <h1 className="text-3xl font-bold mb-2">¡Orden Creada!</h1>
          <p className="text-slate-400">Realiza la transferencia para completar tu registro</p>
        </motion.div>

        {/* Order Reference */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-purple-900/30 to-slate-900/50 border border-purple-500/50 rounded-xl p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Referencia de tu orden</p>
              <p className="text-2xl font-mono font-bold text-purple-400">{orderRef}</p>
            </div>
            <button
              onClick={() => copyToClipboard(orderRef)}
              className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
              title="Copiar referencia"
            >
              <Copy className="text-purple-400" size={20} />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            📌 Guarda esta referencia. La necesitarás para confirmar tu pago.
          </p>
        </motion.div>

        {/* Bank Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-6"
        >
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Building2 className="text-purple-400" size={20} />
            Datos para Transferencia
          </h2>

          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-slate-400 text-sm mb-1">Banco</p>
                <p className="text-white font-bold">{bankInfo.banco}</p>
              </div>
              <button
                onClick={() => copyToClipboard(bankInfo.banco)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Copy className="text-slate-400" size={16} />
              </button>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-slate-400 text-sm mb-1">CLABE Interbancaria</p>
                <p className="text-white font-mono font-bold tracking-wider">{bankInfo.clabe}</p>
              </div>
              <button
                onClick={() => copyToClipboard(bankInfo.clabe)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Copy className="text-slate-400" size={16} />
              </button>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-slate-400 text-sm mb-1">Beneficiario</p>
                <p className="text-white font-bold">{bankInfo.beneficiario}</p>
              </div>
              <button
                onClick={() => copyToClipboard(bankInfo.beneficiario)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Copy className="text-slate-400" size={16} />
              </button>
            </div>

            <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-500/50 flex justify-between items-center">
              <div>
                <p className="text-purple-300 text-sm mb-1">Monto a Transferir</p>
                <p className="text-purple-400 font-bold text-2xl">${parseInt(amount).toLocaleString()} MXN</p>
              </div>
              <button
                onClick={() => copyToClipboard(amount)}
                className="p-2 hover:bg-purple-500/30 rounded-lg transition-colors"
              >
                <Copy className="text-purple-400" size={16} />
              </button>
            </div>

            <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30">
              <p className="text-yellow-400 text-sm font-bold mb-1">📌 Concepto/Referencia de Pago:</p>
              <div className="flex justify-between items-center">
                <p className="text-white font-mono font-bold">{orderRef}</p>
                <button
                  onClick={() => copyToClipboard(orderRef)}
                  className="p-2 hover:bg-yellow-500/20 rounded-lg transition-colors"
                >
                  <Copy className="text-yellow-400" size={16} />
                </button>
              </div>
              <p className="text-yellow-300 text-xs mt-2">
                Incluye esta referencia en el concepto de tu transferencia para identificar tu pago.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-6"
        >
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="text-yellow-400" size={20} />
            Pasos Siguientes
          </h2>

          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-sm font-bold flex-shrink-0">1</span>
              <span className="text-slate-300">Realiza la transferencia por <span className="text-purple-400 font-bold">${parseInt(amount).toLocaleString()} MXN</span></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-sm font-bold flex-shrink-0">2</span>
              <span className="text-slate-300">Toma captura de pantalla de tu comprobante</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-sm font-bold flex-shrink-0">3</span>
              <span className="text-slate-300">Envía el comprobante por WhatsApp junto con tu nombre completo</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-sm font-bold flex-shrink-0">4</span>
              <span className="text-slate-300">Recibirás tus credenciales por email una vez confirmado el pago</span>
            </li>
          </ol>
        </motion.div>

        {/* Time Warning */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6"
        >
          <div className="flex items-center gap-3">
            <Clock className="text-amber-400" size={20} />
            <p className="text-amber-300 text-sm">
              <strong>Importante:</strong> Esta orden expira en <span className="font-bold">72 horas</span>. Realiza tu transferencia antes de ese tiempo.
            </p>
          </div>
        </motion.div>

        {/* WhatsApp Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <a
            href={`https://wa.me/${bankInfo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
              `¡Hola! Acabo de realizar una transferencia.\n\n📋 Referencia: ${orderRef}\n💰 Monto: $${parseInt(amount).toLocaleString()} MXN\n📧 Email: ${email}\n\n[Adjuntar comprobante de pago]`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle size={20} />
            Enviar Comprobante por WhatsApp
          </a>
        </motion.div>

        {/* Email Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-6"
        >
          <p className="text-slate-500 text-sm">
            Tus credenciales serán enviadas a: <span className="text-slate-300">{email}</span>
          </p>
        </motion.div>

        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mt-8"
        >
          <Link
            href="/"
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← Volver al inicio
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

export default function TransferPendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    }>
      <TransferPendingContent />
    </Suspense>
  );
}
