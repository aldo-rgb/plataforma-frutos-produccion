'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { quantumTheme, tw } from '@/lib/theme/quantum';
import { TicketCard } from './components/TicketCard';
import { TransferModal } from './components/TransferModal';

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
    nombre: string;
    startDate: string;
    endDate: string | null;
  };
  organization: {
    name: string;
    logoUrl: string | null;
  };
}

export default function MyTicketsPage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
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

  if (loading) {
    return (
      <div className={`min-h-screen ${tw.bgPrimary} flex items-center justify-center`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className={`animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 ${tw.borderQuantum} mx-auto mb-4`}></div>
          <p className="text-slate-400">Cargando tu wallet...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${tw.bgPrimary} relative overflow-hidden`}>
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-40 w-96 h-96 bg-[#00F0FF] opacity-5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-20 -left-40 w-96 h-96 bg-[#9D4EDD] opacity-5 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 
            className={`text-5xl font-black ${tw.textQuantum} mb-3`}
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Mi Wallet Quantum
          </h1>
          <p className="text-slate-400 text-lg">
            Tus tickets de acceso a los entrenamientos
          </p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <StatCard
            title="Tickets Activos"
            value={tickets.filter(t => t.status === 'ACTIVE').length}
            icon="🎫"
            color="quantum"
          />
          <StatCard
            title="Próximos Eventos"
            value={tickets.filter(t => t.status === 'ACTIVE' && new Date(t.vision.startDate) > new Date()).length}
            icon="📅"
            color="magic"
          />
          <StatCard
            title="Completados"
            value={tickets.filter(t => t.status === 'EXPIRED').length}
            icon="✅"
            color="legendary"
          />
        </motion.div>

        {/* Tickets Grid */}
        {tickets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/50 backdrop-blur-md border border-slate-800/50 rounded-2xl p-12 text-center"
          >
            <div className="text-8xl mb-6">🎫</div>
            <h3 className="text-2xl font-bold text-white mb-3">No tienes tickets aún</h3>
            <p className="text-slate-400 mb-6">
              Adquiere tu primer ticket para comenzar tu jornada de transformación
            </p>
            <button
              onClick={() => window.location.href = '/dashboard/events'}
              className="px-6 py-3 rounded-xl font-bold transition-all"
              style={{
                background: 'linear-gradient(135deg, #00F0FF 0%, #0099CC 100%)',
                boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
                color: '#050B14'
              }}
            >
              Explorar Eventos
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket, index) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <TicketCard
                  ticket={ticket}
                  onTransfer={() => handleTransferClick(ticket)}
                />
              </motion.div>
            ))}
          </div>
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

// Componente StatCard
interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: 'quantum' | 'magic' | 'legendary';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colors = {
    quantum: '#00F0FF',
    magic: '#9D4EDD',
    legendary: '#FFD700',
  };

  const bgColors = {
    quantum: 'from-cyan-900/20 to-blue-900/20',
    magic: 'from-purple-900/20 to-pink-900/20',
    legendary: 'from-yellow-900/20 to-orange-900/20',
  };

  return (
    <div 
      className={`bg-gradient-to-br ${bgColors[color]} backdrop-blur-md border border-slate-800/50 rounded-2xl p-6 relative overflow-hidden group hover:scale-105 transition-transform`}
    >
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: `radial-gradient(circle at center, ${colors[color]}15, transparent)`,
        }}
      ></div>
      
      <div className="relative z-10">
        <div className="text-4xl mb-3">{icon}</div>
        <div 
          className="text-4xl font-black mb-2"
          style={{ 
            fontFamily: 'JetBrains Mono, monospace',
            color: colors[color],
          }}
        >
          {value}
        </div>
        <div className="text-sm text-slate-400 font-medium">{title}</div>
      </div>
    </div>
  );
}
