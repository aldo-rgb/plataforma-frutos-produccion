'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { quantumTheme, tw } from '@/lib/theme/quantum';
import { WalletStack } from './components/WalletStack';
import { TransferModal } from './components/TransferModal';

interface Product {
  id: number;
  name: string;
  imageUrl: string | null;
  description: string | null;
  location: string | null;
  type: string;
}

interface Ticket {
  id: string;
  type: string;
  level: string;
  status: string;
  paymentStatus: string;
  isTransferable: boolean;
  validUntil: string | null;
  purchasePrice: number | null;
  createdAt: string;
  vision: {
    id: number;
    nombre: string;
    startDate: string;
    endDate: string | null;
  };
  organization: {
    name: string;
    logoUrl: string | null;
  };
  product: Product | null;
}

interface User {
  id: number;
  name: string;
  initials: string;
  photo: string | null;
  memberSince: string;
}

export default function MyTicketsPage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchTickets();
    }
  }, [session]);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets/my-tickets');
      const data = await res.json();

      if (data.success) {
        setTickets(data.tickets);
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowTransferModal(true);
  };

  const handleTransferSuccess = () => {
    fetchTickets();
    setShowTransferModal(false);
    setSelectedTicket(null);
  };

  // Buscar ticket BASIC para transferencia
  const basicTicket = tickets.find(t => t.level === 'BASIC' && t.status === 'ACTIVE');
  const canTransfer = basicTicket && basicTicket.isTransferable && 
    new Date(basicTicket.vision.startDate) > new Date();

  if (loading) {
    return (
      <div className={`min-h-screen ${tw.bgPrimary} flex items-center justify-center`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="relative w-24 h-24 mx-auto mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-t-2 border-[#00F0FF]"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-2 rounded-full border-t-2 border-[#9D4EDD]"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-4 rounded-full border-t-2 border-[#FFD700]"
            />
          </div>
          <p className="text-slate-400" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Cargando tu Wallet Quantum...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${tw.bgPrimary} relative overflow-hidden`}>
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-40 w-[600px] h-[600px] bg-[#00F0FF] opacity-[0.03] blur-[150px] rounded-full"></div>
        <div className="absolute bottom-20 -left-40 w-[600px] h-[600px] bg-[#9D4EDD] opacity-[0.03] blur-[150px] rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FFD700] opacity-[0.02] blur-[200px] rounded-full"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 
                className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] via-[#9D4EDD] to-[#FFD700] mb-2"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                QUANTUM WALLET
              </h1>
              <p className="text-slate-400">
                Tus pases de acceso al universo de transformación
              </p>
            </div>
          </div>
        </motion.div>

        {/* Transfer Button */}
        {canTransfer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8 flex justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => basicTicket && handleTransferClick(basicTicket)}
              className="px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 bg-gradient-to-r from-[#00F0FF]/20 to-[#9D4EDD]/20 border border-[#00F0FF]/40 text-[#00F0FF] hover:border-[#00F0FF]/60 hover:shadow-lg hover:shadow-[#00F0FF]/20"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              <span className="text-lg">🔄</span>
              <span>Transferir Tickets</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-[#00F0FF]/20">
                {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
              </span>
            </motion.button>
          </motion.div>
        )}

        {/* Tickets Display - Wallet Stack Style */}
        {tickets.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="pb-20"
          >
            <WalletStack 
              tickets={tickets}
              user={user}
              onTransfer={handleTransferClick}
            />
          </motion.div>
        )}
      </div>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && selectedTicket && (
          <TransferModal
            ticket={selectedTicket}
            onClose={() => setShowTransferModal(false)}
            onSuccess={handleTransferSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Estado vacío
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900/50 backdrop-blur-md border border-slate-800/50 rounded-2xl p-12 text-center max-w-md mx-auto"
    >
      <div className="text-7xl mb-6">🎫</div>
      <h3 
        className="text-2xl font-bold text-white mb-3"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        No tienes tickets aún
      </h3>
      <p className="text-slate-400 mb-6">
        Adquiere tu primer ticket para comenzar tu jornada de transformación
      </p>
      <button
        onClick={() => window.location.href = '/dashboard/events'}
        className="px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #00F0FF 0%, #0099CC 100%)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
          color: '#050B14'
        }}
      >
        Explorar Eventos
      </button>
    </motion.div>
  );
}
