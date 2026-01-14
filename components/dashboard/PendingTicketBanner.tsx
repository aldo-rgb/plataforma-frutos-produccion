'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Ticket, X, CreditCard, ArrowRight, Clock } from 'lucide-react';
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
      'PL': 'Tu VIDA',
    };
    return labels[level] || level;
  };

  const totalPending = pendingTickets.reduce((sum, ticket) => {
    return sum + (ticket.costAtPurchase - ticket.amountPaid);
  }, 0);

  if (isLoading || pendingTickets.length === 0 || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 border border-orange-500/30 p-4 mb-4"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(251,146,60,0.1) 10px, rgba(251,146,60,0.1) 20px)`
          }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-orange-400 text-lg">
                    Tienes un pago pendiente
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    ACCIÓN REQUERIDA
                  </span>
                </div>
                
                <div className="space-y-2">
                  {pendingTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center gap-3 text-sm">
                      <Ticket className="w-4 h-4 text-amber-400" />
                      <span className="text-gray-300">
                        <span className="font-semibold text-white">{getLevelLabel(ticket.level)}</span>
                        {' - '}
                        <span className="text-gray-400">{ticket.vision.nombre}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pendiente: ${(ticket.costAtPurchase - ticket.amountPaid).toLocaleString()} MXN
                      </span>
                    </div>
                  ))}
                </div>

                {pendingTickets.length > 0 && (
                  <p className="text-gray-400 text-sm mt-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Total por pagar: <span className="font-bold text-orange-400">${totalPending.toLocaleString()} MXN</span>
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link href="/dashboard/my-tickets">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-shadow"
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
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
