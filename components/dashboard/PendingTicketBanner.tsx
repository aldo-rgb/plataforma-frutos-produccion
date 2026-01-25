'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Ticket, X, Gift, ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface PendingTicket {
  id: string;
  level: string;
  status: string;
  paymentStatus: string;
  costAtPurchase: number;
  amountPaid: number;
  vision: {
    nombre: string;
  };
}

export default function PendingTicketBanner() {
  const [pendingTickets, setPendingTickets] = useState<PendingTicket[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPendingTickets();
  }, []);

  const fetchPendingTickets = async () => {
    try {
      const response = await fetch('/api/tickets/pending-payment');
      if (!response.ok) return;
      
      const data = await response.json();
      setPendingTickets(data.tickets || []);
    } catch (error) {
      console.error('Error al obtener tickets pendientes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      'BASIC': 'Básico',
      'ADVANCED': 'Avanzado',
      'PL': 'Liderato',
    };
    return labels[level] || level;
  };

  // Calcular saldo a favor y monto restante
  const totalAmountPaid = pendingTickets.reduce((sum, ticket) => sum + Number(ticket.amountPaid || 0), 0);
  const totalPending = pendingTickets.reduce((sum, ticket) => {
    return sum + (Number(ticket.costAtPurchase || 0) - Number(ticket.amountPaid || 0));
  }, 0);
  
  const hasCredit = totalAmountPaid > 0;

  if (isLoading || pendingTickets.length === 0 || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 border border-cyan-500/30 p-3 sm:p-4 mb-4"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(6,182,212,0.1) 10px, rgba(6,182,212,0.1) 20px)`
          }} />
        </div>

        <div className="relative z-10">
          {/* Mobile Layout - Stack everything */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            
            {/* Top section: Icon + Title + Badge + Action Button */}
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>

              {/* Title + Badge */}
              <div className="flex-1 min-w-0">
                {hasCredit ? (
                  <>
                    <h3 className="font-bold text-cyan-400 text-base sm:text-lg leading-tight">
                      ¡Tienes ${totalAmountPaid.toLocaleString('es-MX')} a favor!
                    </h3>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      ✨ POSIBILIDAD DISPONIBLE
                    </span>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-cyan-400 text-base sm:text-lg leading-tight">
                      Tu siguiente nivel te espera
                    </h3>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      ✨ POSIBILIDAD DISPONIBLE
                    </span>
                  </>
                )}
              </div>

              {/* Action Button - Mobile: Top Right */}
              <div className="flex items-center gap-1 sm:hidden">
                <Link href="/dashboard/my-tickets">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-lg shadow-cyan-500/30"
                  >
                    <span>Ver Tickets</span>
                    <ArrowRight className="w-3 h-3" />
                  </motion.button>
                </Link>
              </div>
            </div>

            {/* Desktop Action Button */}
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <Link href="/dashboard/my-tickets">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-shadow"
                >
                  <span>Ver Tickets</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
              
              <button
                onClick={() => setDismissed(true)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Ocultar por ahora"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Ticket Details - Better mobile layout */}
          <div className="mt-3 space-y-2 pl-0 sm:pl-[52px]">
            {pendingTickets.map((ticket) => (
              <div key={ticket.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm bg-slate-800/30 rounded-lg p-2 sm:p-0 sm:bg-transparent">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="text-gray-300">
                    <span className="font-semibold text-white">{getLevelLabel(ticket.level)}</span>
                    {' - '}
                    <span className="text-gray-400 text-xs sm:text-sm">{ticket.vision.nombre}</span>
                  </span>
                </div>
                <span className="ml-6 sm:ml-0 px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                  <Zap className="w-3 h-3" />
                  Disponible con solo: ${(ticket.costAtPurchase - ticket.amountPaid).toLocaleString()} MXN
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          {pendingTickets.length > 0 && (
            <div className="mt-3 pt-2 border-t border-cyan-500/20 pl-0 sm:pl-[52px] flex items-center justify-between">
              <p className="text-gray-400 text-sm flex items-center gap-2">
                <Gift className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Completa tu formación con:</span>
                <span className="sm:hidden">Solo:</span>
                <span className="font-bold text-cyan-400">${totalPending.toLocaleString()} MXN</span>
              </p>
              
              {/* Mobile dismiss button */}
              <button
                onClick={() => setDismissed(true)}
                className="sm:hidden p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Ocultar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
