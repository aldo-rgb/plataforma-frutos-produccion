'use client';

import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';

interface WorkshopTicketProps {
  ticket: {
    id: string;
    status: string;
    type: string;
    createdAt: string;
    validUntil: string | null;
    vision: {
      nombre: string;
      startDate: string;
      endDate?: string | null;
    };
    organization: {
      name: string;
      logoUrl: string | null;
    };
  };
  workshopTitle: string;
  workshopImage?: string | null;
  workshopCategory?: 'ABUNDANCE' | 'LOVE' | 'HEALTH' | 'MINDSET' | 'LEADERSHIP' | 'OTHER';
  location?: string;
}

const categoryConfig: Record<string, { emoji: string; color: string; gradient: string }> = {
  ABUNDANCE: { 
    emoji: '💰', 
    color: '#FFD700',
    gradient: 'from-amber-500/20 via-yellow-500/10 to-orange-500/20'
  },
  LOVE: { 
    emoji: '❤️', 
    color: '#FF006E',
    gradient: 'from-pink-500/20 via-red-500/10 to-rose-500/20'
  },
  HEALTH: { 
    emoji: '🧘', 
    color: '#00F0FF',
    gradient: 'from-cyan-500/20 via-teal-500/10 to-emerald-500/20'
  },
  MINDSET: { 
    emoji: '🧠', 
    color: '#9D4EDD',
    gradient: 'from-purple-500/20 via-violet-500/10 to-indigo-500/20'
  },
  LEADERSHIP: { 
    emoji: '👑', 
    color: '#FFD700',
    gradient: 'from-yellow-500/20 via-amber-500/10 to-orange-500/20'
  },
  OTHER: { 
    emoji: '🎫', 
    color: '#64748B',
    gradient: 'from-slate-500/20 via-gray-500/10 to-zinc-500/20'
  },
};

export function WorkshopTicket({ 
  ticket, 
  workshopTitle, 
  workshopImage, 
  workshopCategory = 'OTHER',
  location = 'Virtual / Zoom'
}: WorkshopTicketProps) {
  const isActive = ticket.status === 'ACTIVE';
  const config = categoryConfig[workshopCategory] || categoryConfig.OTHER;
  
  const startDate = new Date(ticket.vision.startDate);
  const formattedDate = startDate.toLocaleDateString('es-MX', { 
    weekday: 'short',
    day: '2-digit', 
    month: 'short',
  }).toUpperCase();
  const formattedTime = startDate.toLocaleTimeString('es-MX', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      className="relative w-[340px] h-[440px]"
    >
      {/* Holographic Container */}
      <div 
        className={`relative w-full h-full rounded-2xl overflow-hidden ${
          isActive ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-black' : 'bg-slate-800/50'
        }`}
        style={{
          boxShadow: isActive 
            ? `0 0 40px ${config.color}20, 0 20px 60px rgba(0, 0, 0, 0.5)` 
            : 'none',
          border: '2px solid',
          borderColor: isActive ? `${config.color}50` : '#475569',
        }}
      >
        {/* Holographic Shimmer Effect */}
        {isActive && (
          <motion.div
            animate={{
              background: [
                `linear-gradient(45deg, transparent 30%, ${config.color}10 35%, transparent 40%)`,
                `linear-gradient(45deg, transparent 50%, ${config.color}10 55%, transparent 60%)`,
                `linear-gradient(45deg, transparent 70%, ${config.color}10 75%, transparent 80%)`,
              ],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 pointer-events-none"
          />
        )}

        {/* Workshop Image Section (60% del ticket) */}
        <div className="relative h-[55%] overflow-hidden">
          {workshopImage ? (
            <img 
              src={workshopImage} 
              alt={workshopTitle}
              className="w-full h-full object-cover"
              style={{
                filter: isActive ? 'brightness(0.9) saturate(1.1)' : 'grayscale(100%) brightness(0.5)',
              }}
            />
          ) : (
            // Default Abstract Art based on category
            <div 
              className={`w-full h-full bg-gradient-to-br ${config.gradient}`}
              style={{
                backgroundImage: `
                  radial-gradient(circle at 20% 30%, ${config.color}30 0%, transparent 50%),
                  radial-gradient(circle at 80% 70%, ${config.color}20 0%, transparent 50%),
                  radial-gradient(circle at 50% 50%, ${config.color}10 0%, transparent 70%)
                `,
              }}
            >
              {/* Category Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-8xl opacity-30">{config.emoji}</span>
              </div>
            </div>
          )}

          {/* Gradient Overlay */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.9) 100%)',
            }}
          />

          {/* Category Badge */}
          <div 
            className="absolute top-4 left-4 px-3 py-1.5 rounded-full flex items-center gap-2"
            style={{
              background: `${config.color}20`,
              border: `1px solid ${config.color}40`,
              backdropFilter: 'blur(10px)',
            }}
          >
            <span className="text-lg">{config.emoji}</span>
            <span 
              className="text-xs font-bold tracking-wider"
              style={{ color: config.color }}
            >
              {workshopCategory.replace('_', ' ')}
            </span>
          </div>

          {/* ADMIT ONE Stamp */}
          <div className="absolute top-4 right-4">
            <motion.div
              animate={isActive ? { rotate: [-2, 2, -2] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="px-3 py-1 rounded border-2 border-dashed"
              style={{
                borderColor: isActive ? config.color : '#475569',
                background: 'rgba(0,0,0,0.5)',
              }}
            >
              <p 
                className="text-[10px] font-black tracking-[0.2em]"
                style={{ color: isActive ? config.color : '#64748b' }}
              >
                ADMIT ONE
              </p>
            </motion.div>
          </div>

          {/* Title on Image */}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 
              className={`text-2xl font-black leading-tight ${isActive ? 'text-white' : 'text-slate-500'}`}
              style={{ 
                fontFamily: 'Orbitron, sans-serif',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              }}
            >
              {workshopTitle}
            </h3>
          </div>
        </div>

        {/* Zig-Zag Separator */}
        <svg 
          className="absolute w-full" 
          style={{ top: '55%', transform: 'translateY(-50%)' }}
          height="16" 
          viewBox="0 0 340 16" 
          preserveAspectRatio="none"
        >
          <path
            d={`M0,8 ${[...Array(17)].map((_, i) => `L${i * 20 + 10},${i % 2 === 0 ? 0 : 16}`).join(' ')} L340,8`}
            fill="none"
            stroke={isActive ? config.color : '#475569'}
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.5"
          />
        </svg>

        {/* Details Section */}
        <div className="relative h-[45%] p-5 flex flex-col justify-between">
          {/* Event Details */}
          <div className="grid grid-cols-2 gap-4">
            <DetailItem 
              icon="📅" 
              label="FECHA" 
              value={formattedDate} 
              isActive={isActive}
              accentColor={config.color}
            />
            <DetailItem 
              icon="🕐" 
              label="HORA" 
              value={formattedTime} 
              isActive={isActive}
              accentColor={config.color}
            />
            <DetailItem 
              icon="📍" 
              label="UBICACIÓN" 
              value={location.substring(0, 12)} 
              isActive={isActive}
              accentColor={config.color}
            />
            <DetailItem 
              icon="🎟️" 
              label="TIPO" 
              value="WORKSHOP" 
              isActive={isActive}
              accentColor={config.color}
            />
          </div>

          {/* Bottom with QR */}
          <div className="flex items-end justify-between">
            {/* Organization */}
            <div className="flex items-center gap-2">
              {ticket.organization.logoUrl ? (
                <img 
                  src={ticket.organization.logoUrl} 
                  alt={ticket.organization.name}
                  className="w-8 h-8 rounded-full object-cover opacity-60"
                />
              ) : (
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: `${config.color}20` }}
                >
                  <span className="text-xs font-bold" style={{ color: config.color }}>
                    {ticket.organization.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-[10px] text-slate-600">{ticket.organization.name}</p>
                <p className="text-[8px] text-slate-700">ID: {ticket.id.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>

            {/* QR Code */}
            <div 
              className="p-2 rounded-lg"
              style={{
                background: '#000',
                border: `1px solid ${isActive ? config.color : '#475569'}40`,
              }}
            >
              <QRCode
                value={`TICKET:${ticket.id}`}
                size={50}
                bgColor="transparent"
                fgColor={isActive ? config.color : '#64748b'}
                level="M"
              />
            </div>
          </div>
        </div>

        {/* Iridescent Border Effect */}
        {isActive && (
          <motion.div
            animate={{
              background: [
                `linear-gradient(90deg, ${config.color}00 0%, ${config.color}40 50%, ${config.color}00 100%)`,
              ],
              backgroundPosition: ['-200% 0', '200% 0'],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              backgroundSize: '200% 100%',
              maskImage: 'linear-gradient(black, black) padding-box, linear-gradient(black, black)',
              maskComposite: 'exclude',
              WebkitMaskComposite: 'xor',
              padding: '2px',
            }}
          />
        )}
      </div>
    </motion.div>
  );
}

function DetailItem({ 
  icon, 
  label, 
  value, 
  isActive,
  accentColor 
}: { 
  icon: string;
  label: string; 
  value: string; 
  isActive: boolean;
  accentColor: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg opacity-60">{icon}</span>
      <div>
        <p className="text-[8px] text-slate-600 tracking-wider">{label}</p>
        <p 
          className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}
          style={{ fontFamily: 'Orbitron, monospace' }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
