'use client';

import { X, AlertCircle, Clock, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PendingPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ordenId?: number;
  remainingSessions?: string;
  planType?: string;
  frecuencia?: string;
  mentor?: string;
  expiresAt?: string;
}

export default function PendingPaymentModal({
  isOpen,
  onClose,
  ordenId,
  remainingSessions,
  planType,
  frecuencia,
  mentor,
  expiresAt
}: PendingPaymentModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleGoToPayment = () => {
    if (ordenId) {
      router.push(`/dashboard/lobo-solitario/procesar-pago?ordenId=${ordenId}`);
    } else {
      router.push('/dashboard/suscripcion');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-orange-500/30 rounded-2xl shadow-2xl shadow-orange-500/20 max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-b border-orange-500/30 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                Pago Pendiente
              </h2>
              <p className="text-sm text-slate-400">
                Ya tienes una orden de pago en proceso
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
            {remainingSessions && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Sesiones restantes:</span>
                <span className="text-white font-semibold">{remainingSessions}</span>
              </div>
            )}
            
            {planType && frecuencia && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Plan:</span>
                <span className="text-white font-semibold">{planType} {frecuencia}</span>
              </div>
            )}
            
            {mentor && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Mentor:</span>
                <span className="text-white font-semibold">{mentor}</span>
              </div>
            )}
            
            {expiresAt && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Expira:</span>
                <span className="text-orange-400 font-semibold">
                  {new Date(expiresAt).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-300">
                <p className="font-medium text-orange-400 mb-1">¿Qué puedes hacer?</p>
                <ul className="space-y-1 text-slate-400">
                  <li>• Completa tu pago pendiente ahora</li>
                  <li>• Espera 30 minutos para crear una nueva orden</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all duration-200"
          >
            Cerrar
          </button>
          <button
            onClick={handleGoToPayment}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl font-bold transition-all duration-200 shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Ir a Pagar
          </button>
        </div>
      </div>
    </div>
  );
}
