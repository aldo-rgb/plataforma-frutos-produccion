'use client';

import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';

interface BasicTicketProps {
  ticket: {
    id: string;
    status: string;
    createdAt: string;
    vision: {
      nombre: string;
      startDate: string;
    };
    organization: {
      name: string;
      logoUrl: string | null;
    };
  };
  userName: string;
  userInitials: string;
  userPhoto?: string | null;
}

export function BasicTicket({ ticket, userName, userInitials, userPhoto }: BasicTicketProps) {
  const isActive = ticket.status === 'ACTIVE';
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, rotateY: 5 }}
      className="relative w-[280px] h-[420px] perspective-1000"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Main Card */}
      <div 
        className={`relative w-full h-full rounded-2xl overflow-hidden`}
        style={{
          boxShadow: isActive 
            ? '0 0 40px rgba(0, 240, 255, 0.3), inset 0 1px 0 rgba(0, 240, 255, 0.2)' 
            : 'none',
          border: '2px solid',
          borderColor: isActive ? '#00F0FF' : '#475569',
        }}
      >
        {/* CORO2.png Background Image */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/CORO2.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: isActive ? 0.15 : 0.05,
          }}
        />
        {/* Dark Overlay for readability */}
        <div className={`absolute inset-0 ${
          isActive ? 'bg-gradient-to-b from-slate-950/90 via-slate-900/85 to-black/95' : 'bg-slate-800/80'
        }`} />

        {/* Scan Lines Effect */}
        {isActive && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div 
              className="absolute inset-0 opacity-5"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 240, 255, 0.1) 2px, rgba(0, 240, 255, 0.1) 4px)',
              }}
            />
          </div>
        )}

        {/* Header - ACCESS GRANTED */}
        <div className="relative z-10 p-4">
          <div 
            className={`text-center py-2 px-4 rounded-lg ${isActive ? 'bg-[#00F0FF]/10' : 'bg-slate-700/30'}`}
            style={{
              border: `1px solid ${isActive ? 'rgba(0, 240, 255, 0.3)' : '#475569'}`,
            }}
          >
            <p 
              className={`text-xs tracking-[0.3em] font-bold ${isActive ? 'text-[#00F0FF]' : 'text-slate-500'}`}
              style={{ fontFamily: 'monospace' }}
            >
              {isActive ? '▸ ACCESS GRANTED ◂' : '▸ ACCESS EXPIRED ◂'}
            </p>
          </div>
        </div>

        {/* Organization Logo */}
        <div className="relative z-10 flex justify-center my-4">
          <div className="relative">
            {/* Rotating Ring */}
            {isActive && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-3"
              >
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#00F0FF"
                    strokeWidth="1"
                    strokeDasharray="10 5"
                    opacity="0.5"
                  />
                </svg>
              </motion.div>
            )}
            
            {/* Hexagon Container with Organization Logo */}
            <div 
              className="relative w-24 h-24 flex items-center justify-center"
              style={{
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                background: isActive 
                  ? 'linear-gradient(180deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 240, 255, 0.05) 100%)'
                  : 'rgba(71, 85, 105, 0.3)',
              }}
            >
              {ticket.organization.logoUrl ? (
                <img 
                  src={ticket.organization.logoUrl} 
                  alt={ticket.organization.name}
                  className="w-16 h-16 object-contain"
                  style={{ 
                    filter: isActive ? 'brightness(1.2) drop-shadow(0 0 8px rgba(0, 240, 255, 0.5))' : 'grayscale(100%) opacity(0.5)',
                  }}
                />
              ) : (
                <span 
                  className={`text-3xl font-black ${isActive ? 'text-[#00F0FF]' : 'text-slate-500'}`}
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {userInitials}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* User Data */}
        <div className="relative z-10 px-4 space-y-2">
          <DataRow label="CODENAME" value={userName.split(' ')[0].toUpperCase()} isActive={isActive} />
          <DataRow label="LEVEL" value="01 // ORIGIN" isActive={isActive} />
          <DataRow label="STATUS" value="RECRUIT" isActive={isActive} />
          <DataRow label="VISION" value={ticket.vision.nombre.substring(0, 15)} isActive={isActive} />
        </div>

        {/* Bottom Section with QR */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex justify-center">
            <div 
              className="p-3 rounded-lg"
              style={{
                background: isActive ? '#000' : '#1e293b',
                border: `2px solid ${isActive ? '#00F0FF' : '#475569'}`,
              }}
            >
              <QRCode
                value={`TICKET:${ticket.id}`}
                size={80}
                bgColor="transparent"
                fgColor={isActive ? '#00F0FF' : '#64748b'}
                level="M"
              />
            </div>
          </div>
          <p 
            className={`text-center text-[9px] mt-2 tracking-wide ${isActive ? 'text-[#00F0FF]/60' : 'text-slate-600'}`}
            style={{ fontFamily: 'monospace' }}
          >
            ID: {ticket.id.toUpperCase()}
          </p>
        </div>

        {/* Glowing Edge Effect */}
        {isActive && (
          <div 
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 30px rgba(0, 240, 255, 0.1)',
            }}
          />
        )}
      </div>
    </motion.div>
  );
}

function DataRow({ label, value, isActive }: { label: string; value: string; isActive: boolean }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
      <span 
        className={`text-[10px] tracking-wider ${isActive ? 'text-slate-500' : 'text-slate-600'}`}
        style={{ fontFamily: 'monospace' }}
      >
        {label}:
      </span>
      <span 
        className={`text-xs font-bold ${isActive ? 'text-[#00F0FF]' : 'text-slate-500'}`}
        style={{ fontFamily: 'Orbitron, monospace' }}
      >
        {value}
      </span>
    </div>
  );
}
