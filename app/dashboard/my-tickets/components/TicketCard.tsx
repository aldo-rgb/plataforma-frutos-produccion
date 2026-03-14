import { motion } from 'framer-motion';
import { tw } from '@/lib/theme/quantum';

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
    advancedStartDate: string | null;
    advancedEndDate: string | null;
    plStartDate: string | null;
    plEndDate: string | null;
  };
  organization: {
    name: string;
    logoUrl: string | null;
  };
}

interface Props {
  ticket: Ticket;
  onTransfer: () => void;
}

export function TicketCard({ ticket, onTransfer }: Props) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: 'from-cyan-900/30 to-blue-900/30', border: 'border-[#00F0FF]/50', text: 'text-[#00F0FF]', glow: '0 0 30px rgba(0, 240, 255, 0.4)' };
      case 'PENDING_PAYMENT':
        return { bg: 'from-yellow-900/30 to-orange-900/30', border: 'border-[#FFA500]/50', text: 'text-[#FFA500]', glow: '0 0 30px rgba(255, 165, 0, 0.4)' };
      case 'TRANSFERRED':
        return { bg: 'from-slate-800/30 to-slate-700/30', border: 'border-slate-600/50', text: 'text-slate-400', glow: 'none' };
      case 'EXPIRED':
        return { bg: 'from-slate-900/30 to-slate-800/30', border: 'border-slate-700/50', text: 'text-slate-500', glow: 'none' };
      default:
        return { bg: 'from-slate-800/30 to-slate-700/30', border: 'border-slate-600/50', text: 'text-slate-400', glow: 'none' };
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'BASIC':
        return { emoji: '🌱', label: 'Básico', color: '#00F0FF' };
      case 'ADVANCED':
        return { emoji: '⚡', label: 'Avanzado', color: '#9D4EDD' };
      case 'PL':
        return { emoji: '👑', label: 'Liderato', color: '#FFD700' };
      default:
        return { emoji: '🎫', label: level, color: '#64748B' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Activo';
      case 'PENDING_PAYMENT':
        return 'Pago Pendiente';
      case 'TRANSFERRED':
        return 'Transferido';
      case 'EXPIRED':
        return 'Expirado';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const statusStyle = getStatusColor(ticket.status);
  const levelBadge = getLevelBadge(ticket.level);

  // Obtener fechas según el nivel del ticket
  const getTrainingDates = () => {
    switch (ticket.level) {
      case 'ADVANCED':
        return {
          start: ticket.vision.advancedStartDate || ticket.vision.startDate,
          end: ticket.vision.advancedEndDate || ticket.vision.endDate,
        };
      case 'PL':
        return {
          start: ticket.vision.plStartDate || ticket.vision.startDate,
          end: ticket.vision.plEndDate || ticket.vision.endDate,
        };
      default: // BASIC
        return {
          start: ticket.vision.startDate,
          end: ticket.vision.endDate,
        };
    }
  };

  const trainingDates = getTrainingDates();
  const isEventStarted = new Date(trainingDates.start) <= new Date();
  const isEventEnded = trainingDates.end ? new Date(trainingDates.end) <= new Date() : false;
  const daysUntilStart = Math.ceil((new Date(trainingDates.start).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  const canTransfer = ticket.status === 'ACTIVE' && 
                      ticket.isTransferable && 
                      !isEventStarted &&
                      daysUntilStart > 0;

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      className={`relative bg-gradient-to-br ${statusStyle.bg} backdrop-blur-md border-2 ${statusStyle.border} rounded-2xl p-6 transition-all duration-300 overflow-hidden group`}
      style={{
        boxShadow: statusStyle.glow,
      }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}></div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {ticket.organization.logoUrl ? (
            <img
              src={ticket.organization.logoUrl}
              alt={ticket.organization.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#00F0FF] to-[#0099CC] flex items-center justify-center text-white font-bold text-xl">
              {ticket.organization.name.charAt(0)}
            </div>
          )}
          <div>
            <div 
              className="text-xs font-medium mb-1"
              style={{ color: levelBadge.color }}
            >
              {levelBadge.emoji} {levelBadge.label}
            </div>
            <div className="text-sm text-slate-400">{ticket.organization.name}</div>
          </div>
        </div>
        
        {/* Status badge */}
        <div 
          className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyle.text} border ${statusStyle.border} bg-slate-900/50`}
        >
          {getStatusLabel(ticket.status)}
        </div>
      </div>

      {/* Vision Info */}
      <div className="relative z-10 mb-4">
        <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          {ticket.vision.nombre}
        </h3>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <span>📅</span>
            <span>
              {new Date(trainingDates.start).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {trainingDates.end && (
                <span className="text-slate-400">
                  {' → '}
                  {new Date(trainingDates.end).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </span>
              )}
            </span>
          </div>
          {!isEventStarted && daysUntilStart > 0 && (
            <div className={`flex items-center gap-2 ${statusStyle.text} font-medium`}>
              <span>⏱️</span>
              <span>Inicia en {daysUntilStart} días</span>
            </div>
          )}
          {isEventStarted && !isEventEnded && (
            <div className="flex items-center gap-2 text-[#00F0FF] font-medium">
              <span>▶️</span>
              <span>En progreso</span>
            </div>
          )}
          {isEventEnded && (
            <div className="flex items-center gap-2 text-slate-500">
              <span>✅</span>
              <span>Completado</span>
            </div>
          )}
        </div>
      </div>

      {/* Price */}
      {ticket.purchasePrice && (
        <div className="relative z-10 mb-4">
          <div className="text-xs text-slate-400 mb-1">Precio de compra</div>
          <div 
            className="text-2xl font-black"
            style={{ 
              fontFamily: 'JetBrains Mono, monospace',
              color: levelBadge.color,
            }}
          >
            ${ticket.purchasePrice.toLocaleString('es-MX')} MXN
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="relative z-10 pt-4 border-t border-slate-700/50">
        {canTransfer ? (
          <button
            onClick={onTransfer}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #00F0FF 0%, #0099CC 100%)',
              color: '#050B14',
              boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
            }}
          >
            ➡️ Transferir Ticket
          </button>
        ) : ticket.status === 'TRANSFERRED' ? (
          <div className="text-center py-3 text-sm text-slate-500">
            <span>🔒</span> Este ticket fue transferido
          </div>
        ) : isEventStarted ? (
          <div className="text-center py-3 text-sm text-slate-500">
            <span>⏰</span> Tiempo de transferencia agotado
          </div>
        ) : !ticket.isTransferable ? (
          <div className="text-center py-3 text-sm text-slate-500">
            <span>🔒</span> No transferible
          </div>
        ) : (
          <div className="text-center py-3 text-sm text-slate-400">
            Ver detalles
          </div>
        )}
      </div>

      {/* Ticket ID */}
      <div className="relative z-10 mt-3 text-[10px] text-slate-600 font-mono text-center">
        ID: {ticket.id.toUpperCase()}
      </div>
    </motion.div>
  );
}
