'use client';

import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';

interface LeadershipTicketProps {
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
  memberSince: string;
}

export function LeadershipTicket({ ticket, userName, memberSince }: LeadershipTicketProps) {
  const isActive = ticket.status === 'ACTIVE';
  const memberYear = new Date(memberSince).getFullYear();
  
  // Format user ID like credit card - usando ID completo
  const formattedId = ticket.id.toUpperCase().replace(/(.{4})/g, '$1 ').trim();
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, rotateY: -5 }}
      className="relative w-[420px] h-[265px] perspective-1000"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Main Card */}
      <div 
        className={`relative w-full h-full rounded-2xl overflow-hidden ${
          isActive ? 'bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-[#000000]' : 'bg-slate-800/50'
        }`}
        style={{
          boxShadow: isActive 
            ? '0 25px 80px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.15)' 
            : 'none',
          border: '1px solid',
          borderColor: isActive ? 'rgba(255, 215, 0, 0.3)' : '#475569',
        }}
      >
        {/* Carbon Fiber Texture */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23333' fill-opacity='0.4'%3E%3Cpath d='M5 0h1L0 5v1h1L6 1V0H5zM6 5v1H5l1-1z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Metallic Sheen Effect */}
        {isActive && (
          <motion.div
            animate={{
              background: [
                'linear-gradient(105deg, transparent 40%, rgba(255, 215, 0, 0.1) 45%, transparent 50%)',
                'linear-gradient(105deg, transparent 50%, rgba(255, 215, 0, 0.1) 55%, transparent 60%)',
                'linear-gradient(105deg, transparent 60%, rgba(255, 215, 0, 0.1) 65%, transparent 70%)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            className="absolute inset-0 pointer-events-none"
          />
        )}

        {/* Header with Logo */}
        <div className="relative z-10 p-6 flex justify-between items-start">
          <div>
            <p 
              className={`text-lg tracking-[0.2em] ${isActive ? 'text-[#FFD700]' : 'text-slate-500'}`}
              style={{ 
                fontFamily: 'Cinzel, serif',
                textShadow: isActive ? '0 0 20px rgba(255, 215, 0, 0.5)' : 'none',
              }}
            >
              QUANTUM ELITE
            </p>
            <p className="text-[10px] text-slate-600 tracking-widest mt-1">LEADERSHIP PROGRAM</p>
          </div>
          
          {/* Organization Logo */}
          <div className="flex items-center gap-2">
            {ticket.organization.logoUrl ? (
              <img 
                src={ticket.organization.logoUrl} 
                alt={ticket.organization.name}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-[#FFD700]/30"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] flex items-center justify-center">
                <span className="text-black font-bold text-sm">
                  {ticket.organization.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* EMV Chip */}
        <div className="relative z-10 px-6 mb-4">
          <div 
            className="w-12 h-10 rounded-md"
            style={{
              background: isActive 
                ? 'linear-gradient(135deg, #FFD700 0%, #B8860B 50%, #FFD700 100%)'
                : 'linear-gradient(135deg, #64748b 0%, #475569 50%, #64748b 100%)',
              boxShadow: isActive ? '0 2px 10px rgba(255, 215, 0, 0.3)' : 'none',
            }}
          >
            {/* Chip Lines */}
            <div className="w-full h-full p-1.5 flex flex-col justify-center gap-1">
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i} 
                  className="h-0.5 rounded-full"
                  style={{
                    background: isActive ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.2)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Card Number */}
        <div className="relative z-10 px-6 mb-4">
          <p 
            className={`text-xl tracking-[0.15em] font-light ${isActive ? 'text-white' : 'text-slate-500'}`}
            style={{ 
              fontFamily: 'OCR A Std, monospace',
              textShadow: isActive ? '0 2px 4px rgba(0,0,0,0.5)' : 'none',
            }}
          >
            {formattedId}
          </p>
        </div>

        {/* Member Info */}
        <div className="relative z-10 px-6 flex justify-between items-end">
          <div>
            <p className="text-[8px] text-slate-600 tracking-wider mb-1">MEMBER NAME</p>
            <p 
              className={`text-lg tracking-wider uppercase ${isActive ? 'text-white' : 'text-slate-500'}`}
              style={{ 
                fontFamily: 'Cinzel, serif',
                textShadow: isActive ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              {userName}
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-[8px] text-slate-600 tracking-wider mb-1">MEMBER SINCE</p>
            <p 
              className={`text-sm ${isActive ? 'text-[#FFD700]' : 'text-slate-500'}`}
              style={{ fontFamily: 'monospace' }}
            >
              {memberYear}
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-12 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {/* Contactless Icon */}
            <svg 
              className={`w-6 h-6 ${isActive ? 'text-[#FFD700]' : 'text-slate-600'}`} 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            
            {/* Vision Name */}
            <p className="text-[10px] text-slate-600 tracking-wider">
              {ticket.vision.nombre.toUpperCase()}
            </p>
          </div>

          {/* Mini QR - Discreto */}
          <div 
            className="p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255, 215, 0, 0.2)',
            }}
          >
            <QRCode
              value={`TICKET:${ticket.id}`}
              size={32}
              bgColor="transparent"
              fgColor={isActive ? '#FFD700' : '#64748b'}
              level="L"
            />
          </div>
        </div>

        {/* Premium Badge */}
        {isActive && (
          <div 
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)',
              borderRadius: '50%',
              boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
            }}
          >
            <span className="text-black text-sm">👑</span>
          </div>
        )}

        {/* Edge Glow */}
        {isActive && (
          <div 
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255, 215, 0, 0.1), inset 0 -1px 0 rgba(0,0,0,0.5)',
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
