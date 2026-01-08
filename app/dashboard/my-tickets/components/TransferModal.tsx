import { useState } from 'react';
import { motion } from 'framer-motion';
import { tw } from '@/lib/theme/quantum';

interface Ticket {
  id: string;
  type: string;
  level: string;
  status: string;
  isTransferable: boolean;
  vision: {
    nombre: string;
    startDate: string;
  };
  organization: {
    name: string;
  };
}

interface Props {
  ticket: Ticket;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferModal({ ticket, onClose, onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [recipientInfo, setRecipientInfo] = useState<{ name: string; email: string } | null>(null);

  const daysUntilStart = Math.ceil((new Date(ticket.vision.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const hoursUntilDeadline = Math.max(0, daysUntilStart * 24);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/tickets/validate-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.id,
          recipientEmail: email,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setRecipientInfo(data.recipient);
        setStep('confirm');
      } else {
        setError(data.error || 'Error al validar transferencia');
      }
    } catch (error) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTransfer = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/tickets/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.id,
          recipientEmail: email,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStep('success');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setError(data.error || 'Error al transferir ticket');
        setStep('form');
      }
    } catch (error) {
      setError('Error al transferir ticket');
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900/95 backdrop-blur-xl border-2 border-[#00F0FF]/30 rounded-2xl p-8 max-w-md w-full relative overflow-hidden"
        style={{
          boxShadow: '0 0 60px rgba(0, 240, 255, 0.3)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {step === 'form' && (
          <>
            {/* Header */}
            <div className="mb-6">
              <h2 className={`text-3xl font-black ${tw.textQuantum} mb-2`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Transferir Ticket
              </h2>
              <p className="text-slate-400 text-sm">
                {ticket.vision.nombre} - {ticket.organization.name}
              </p>
            </div>

            {/* Warning Alert */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <div className="text-yellow-400 font-bold text-sm mb-1">
                    ⏰ Tiempo límite para transferir
                  </div>
                  <div className="text-yellow-300/80 text-xs mb-2">
                    Puedes transferir hasta 1 hora después del inicio del evento
                  </div>
                  <div 
                    className="text-xl font-black text-yellow-400"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {hoursUntilDeadline}h restantes
                  </div>
                </div>
              </div>
            </div>

            {/* Info boxes */}
            <div className="space-y-3 mb-6">
              <div className="bg-slate-800/50 rounded-lg p-3 text-sm">
                <div className="text-slate-400 mb-1">🔒 Regla de transferencia</div>
                <div className="text-slate-300">
                  Un ticket solo puede transferirse <strong className={tw.textQuantum}>una vez</strong>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-sm">
                <div className="text-slate-400 mb-1">📧 Notificación</div>
                <div className="text-slate-300">
                  El destinatario recibirá un email con instrucciones
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email del beneficiario <span className={tw.textQuantum}>*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@email.com"
                  required
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00F0FF]/50 focus:border-[#00F0FF]/50 transition-all"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Si no tiene cuenta, se creará una automáticamente
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #00F0FF 0%, #0099CC 100%)',
                  color: '#050B14',
                  boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
                }}
              >
                {loading ? 'Validando...' : 'Continuar →'}
              </button>
            </form>
          </>
        )}

        {step === 'confirm' && recipientInfo && (
          <>
            {/* Header */}
            <div className="mb-6">
              <h2 className={`text-3xl font-black ${tw.textQuantum} mb-2`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Confirmar Transferencia
              </h2>
              <p className="text-slate-400 text-sm">
                Verifica los datos antes de continuar
              </p>
            </div>

            {/* Recipient Info */}
            <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-2 border-[#00F0FF]/30 rounded-xl p-6 mb-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#0099CC] flex items-center justify-center text-white text-2xl font-bold">
                  {recipientInfo.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-xl font-bold text-white mb-1">{recipientInfo.name}</div>
                <div className="text-sm text-slate-400">{recipientInfo.email}</div>
              </div>
              <div className="border-t border-[#00F0FF]/20 pt-4 mt-4">
                <div className="text-xs text-slate-400 mb-2">Recibirá acceso a:</div>
                <div className="text-lg font-bold text-white">{ticket.vision.nombre}</div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div className="flex-1">
                  <div className="text-red-400 font-bold text-sm mb-1">Esta acción no se puede deshacer</div>
                  <div className="text-red-300/80 text-xs">
                    Una vez transferido, no podrás recuperar este ticket ni transferirlo de nuevo
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4"
              >
                {error}
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('form')}
                disabled={loading}
                className="flex-1 py-3 rounded-xl font-bold bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-700/50 transition-all disabled:opacity-50"
              >
                ← Atrás
              </button>
              <button
                onClick={handleConfirmTransfer}
                disabled={loading}
                className="flex-1 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #00F0FF 0%, #0099CC 100%)',
                  color: '#050B14',
                  boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
                }}
              >
                {loading ? 'Transfiriendo...' : 'Confirmar ✓'}
              </button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center"
            >
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <h3 className="text-2xl font-black text-white mb-2">¡Transferencia Exitosa!</h3>
            <p className="text-slate-400 mb-4">
              El ticket ha sido transferido correctamente
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
              <span className="animate-pulse">●</span>
              <span>Notificación enviada por email</span>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
