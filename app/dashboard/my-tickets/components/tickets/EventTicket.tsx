'use client';

import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import { AlertTriangle } from 'lucide-react';

interface EventTicketProps {
  ticket: {
    id: string;
    level: string;
    status: string;
    type?: string;
    paymentStatus?: string;
    isTransferable?: boolean;
    createdAt: string;
    ticketCode?: string;
    vision: {
      nombre: string;
      startDate: string;
    };
    organization: {
      name: string;
      logoUrl: string | null;
    };
    product?: {
      name: string;
      imageUrl?: string | null;
    } | null;
  };
  userName: string;
  userInitials: string;
  userPhoto?: string | null;
}

export function EventTicket({ ticket, userName, userInitials, userPhoto }: EventTicketProps) {
  const isActive = ticket.status === 'ACTIVE';
  const isNonTransferable = ticket.isTransferable === false;
  
  const primaryColor = '#00F0FF'; // Cyan color
  const eventName = ticket.product?.name || ticket.vision.nombre;
  
  return (
    <motion.div
      className="relative w-[280px] h-[420px]"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Main Card */}
      <div 
        className="relative w-full h-full rounded-2xl overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a1628] to-black"
        style={{
          boxShadow: `0 0 40px ${primaryColor}30, inset 0 1px 0 ${primaryColor}30`,
          border: '2px solid',
          borderColor: primaryColor,
        }}
      >
        {/* Circuit Board Pattern Background */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`circuit-event-${ticket.id}`} x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M10 10h30M10 10v30M40 10v15M25 25h15M25 25v15M10 40h15" stroke={primaryColor} strokeWidth="0.5" fill="none"/>
                <circle cx="10" cy="10" r="2" fill={primaryColor}/>
                <circle cx="40" cy="10" r="2" fill={primaryColor}/>
                <circle cx="40" cy="25" r="2" fill={primaryColor}/>
                <circle cx="25" cy="25" r="2" fill={primaryColor}/>
                <circle cx="25" cy="40" r="2" fill={primaryColor}/>
                <circle cx="10" cy="40" r="2" fill={primaryColor}/>
                {/* Additional circuit elements */}
                <rect x="18" y="5" width="4" height="4" fill={primaryColor} opacity="0.5"/>
                <rect x="35" y="35" width="4" height="4" fill={primaryColor} opacity="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#circuit-event-${ticket.id})`}/>
          </svg>
        </div>

        {/* Scan Lines Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              background: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${primaryColor}20 2px, ${primaryColor}20 4px)`,
            }}
          />
        </div>

        {/* Corner Decorations */}
        <div className="absolute top-0 left-0 w-8 h-8">
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: primaryColor }} />
          <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#22c55e' }} />
        </div>
        <div className="absolute top-0 right-0 w-8 h-8">
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: primaryColor }} />
          <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#22c55e' }} />
        </div>
        <div className="absolute bottom-0 left-0 w-8 h-8">
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: primaryColor }} />
        </div>
        <div className="absolute bottom-0 right-0 w-8 h-8">
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: primaryColor }} />
        </div>

        {/* Header Section */}
        <div className="relative z-10 pt-4 px-4">
          {/* Security Protocol Text */}
          <p 
            className="text-center text-[8px] tracking-[0.3em] mb-1"
            style={{ 
              fontFamily: 'monospace',
              color: `${primaryColor}80`,
            }}
          >
            SECURITY ACCESS PROTOCOL
          </p>
          
          {/* Event Name - Large */}
          <h1 
            className="text-center text-xl font-black tracking-wider mb-3"
            style={{ 
              fontFamily: 'Orbitron, sans-serif',
              color: primaryColor,
              textShadow: `0 0 20px ${primaryColor}60`,
            }}
          >
            {eventName.toUpperCase()}
          </h1>
        </div>

        {/* Logo/Icon Section */}
        <div className="relative z-10 flex justify-center mb-4">
          <div className="relative">
            {/* Rotating Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-3"
            >
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={primaryColor}
                  strokeWidth="1"
                  strokeDasharray="10 5"
                  opacity="0.4"
                />
              </svg>
            </motion.div>
            
            {/* Hexagon Container */}
            <div 
              className="relative w-20 h-20 flex items-center justify-center"
              style={{
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                background: `linear-gradient(180deg, ${primaryColor}30 0%, ${primaryColor}10 100%)`,
              }}
            >
              {/* Quantum Symbol + Samurai Icon */}
              <svg viewBox="0 0 100 100" className="w-14 h-14" style={{ filter: `drop-shadow(0 0 8px ${primaryColor})` }}>
                {/* Atom orbits */}
                <ellipse cx="50" cy="50" rx="35" ry="12" fill="none" stroke={primaryColor} strokeWidth="1.5" transform="rotate(0 50 50)" opacity="0.7"/>
                <ellipse cx="50" cy="50" rx="35" ry="12" fill="none" stroke={primaryColor} strokeWidth="1.5" transform="rotate(60 50 50)" opacity="0.7"/>
                <ellipse cx="50" cy="50" rx="35" ry="12" fill="none" stroke={primaryColor} strokeWidth="1.5" transform="rotate(-60 50 50)" opacity="0.7"/>
                {/* Central nucleus */}
                <circle cx="50" cy="50" r="6" fill={primaryColor}/>
                {/* Samurai helmet hint at top */}
                <path d="M50 25 L35 40 L50 35 L65 40 Z" fill={primaryColor} opacity="0.8"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ACCESS GRANTED Badge */}
        <div className="relative z-10 px-4 mb-3">
          <div 
            className="text-center py-2 px-4 rounded-lg"
            style={{
              background: `${primaryColor}15`,
              border: `1px solid ${primaryColor}40`,
            }}
          >
            <p 
              className="text-xs tracking-[0.15em] font-bold flex items-center justify-center gap-2"
              style={{ 
                fontFamily: 'Orbitron, monospace',
                color: primaryColor,
              }}
            >
              <span>✓</span> ACCESS GRANTED
            </p>
          </div>
          
          {/* Non-Transferable Warning */}
          {isNonTransferable && (
            <div 
              className="mt-2 text-center py-1.5 px-2 rounded"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <p 
                className="text-[9px] tracking-wider font-bold flex items-center justify-center gap-1"
                style={{ 
                  fontFamily: 'monospace',
                  color: '#ef4444',
                }}
              >
                <AlertTriangle className="w-3 h-3" />
                NO TRANSFERIBLE
              </p>
            </div>
          )}
        </div>

        {/* Data Section */}
        <div className="relative z-10 px-5 space-y-2">
          <DataRow label="CODENAME" value={userName.split(' ')[0].toUpperCase()} color={primaryColor} />
          <DataRow label="LEVEL" value="BÁSICO" color={primaryColor} />
          <DataRow label="STATUS" value="PARTICIPANTE" color={primaryColor} />
          <DataRow label="VISION" value={eventName} color={primaryColor} />
        </div>

        {/* QR Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex justify-center">
            <div 
              className="p-2.5 rounded-lg"
              style={{
                background: '#000',
                border: `1px solid ${primaryColor}60`,
              }}
            >
              <QRCode
                value={ticket.ticketCode || `EVENT:${ticket.id}`}
                size={80}
                bgColor="transparent"
                fgColor={primaryColor}
                level="M"
              />
            </div>
          </div>
          <p 
            className="text-center text-[10px] mt-2 tracking-widest"
            style={{ 
              fontFamily: 'monospace',
              color: `${primaryColor}80`,
            }}
          >
            ID: {ticket.id.toUpperCase()}
          </p>
        </div>

        {/* Glowing Edge Effect */}
        <div 
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: `inset 0 0 30px ${primaryColor}10`,
          }}
        />
      </div>
    </motion.div>
  );
}

function DataRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-slate-800/30">
      <span 
        className="text-[10px] tracking-wider"
        style={{ 
          fontFamily: 'monospace',
          color: '#64748b',
        }}
      >
        {label}:
      </span>
      <span 
        className="text-[12px] font-bold tracking-wide"
        style={{ 
          fontFamily: 'Orbitron, monospace',
          color: color,
        }}
      >
        {value}
      </span>
    </div>
  );
}
