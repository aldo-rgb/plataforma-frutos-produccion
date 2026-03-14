'use client';

import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import { AlertTriangle, Shield, Zap } from 'lucide-react';

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
  
  const primaryColor = '#00F0FF';
  const accentColor = '#9D4EDD';
  const eventName = ticket.product?.name || ticket.vision.nombre;
  const ticketId = ticket.id.replace('event-', '');
  
  return (
    <motion.div
      className="relative w-[300px] h-[520px]"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Outer Glow */}
      <div 
        className="absolute -inset-1 rounded-3xl opacity-50 blur-xl"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}40 0%, ${accentColor}40 100%)`,
        }}
      />
      
      {/* Main Card */}
      <div 
        className="relative w-full h-full rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0a1929 0%, #051118 50%, #020a10 100%)',
          boxShadow: `0 0 0 1px ${primaryColor}50, 0 0 30px ${primaryColor}20`,
        }}
      >
        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-30">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`grid-${ticket.id}`} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M30 0L0 0 0 30" fill="none" stroke={primaryColor} strokeWidth="0.3" opacity="0.5"/>
              </pattern>
              <linearGradient id={`fade-${ticket.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="white" stopOpacity="1"/>
                <stop offset="100%" stopColor="white" stopOpacity="0"/>
              </linearGradient>
              <mask id={`mask-${ticket.id}`}>
                <rect width="100%" height="100%" fill={`url(#fade-${ticket.id})`}/>
              </mask>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${ticket.id})`} mask={`url(#mask-${ticket.id})`}/>
          </svg>
        </div>

        {/* Top Accent Line */}
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${primaryColor} 50%, transparent 100%)`,
          }}
        />

        {/* Corner Brackets */}
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 rounded-tl" style={{ borderColor: primaryColor }} />
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 rounded-tr" style={{ borderColor: primaryColor }} />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 rounded-bl" style={{ borderColor: primaryColor }} />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 rounded-br" style={{ borderColor: primaryColor }} />

        {/* Status LEDs */}
        <div className="absolute top-5 left-5 flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-lg shadow-cyan-500/50" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col h-full px-5 py-6">
          
          {/* Header */}
          <div className="text-center mb-4">
            <p 
              className="text-[9px] tracking-[0.4em] mb-2 opacity-60"
              style={{ fontFamily: 'monospace', color: primaryColor }}
            >
              ◆ QUANTUM ACCESS PASS ◆
            </p>
            <h1 
              className="text-2xl font-black tracking-wider leading-tight"
              style={{ 
                fontFamily: 'Orbitron, sans-serif',
                color: '#fff',
                textShadow: `0 0 30px ${primaryColor}80, 0 0 60px ${primaryColor}40`,
              }}
            >
              {eventName.toUpperCase()}
            </h1>
          </div>

          {/* Quantum Symbol */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-4"
              >
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke={primaryColor} strokeWidth="0.5" strokeDasharray="4 8" opacity="0.4"/>
                </svg>
              </motion.div>
              
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}20 0%, ${accentColor}20 100%)`,
                  border: `1px solid ${primaryColor}40`,
                }}
              >
                <Zap className="w-8 h-8" style={{ color: primaryColor, filter: `drop-shadow(0 0 8px ${primaryColor})` }} />
              </div>
            </div>
          </div>

          {/* Access Status */}
          <div 
            className="mx-auto px-6 py-2 rounded-full mb-4"
            style={{
              background: `linear-gradient(90deg, ${primaryColor}15 0%, ${primaryColor}25 50%, ${primaryColor}15 100%)`,
              border: `1px solid ${primaryColor}50`,
            }}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: '#22c55e' }} />
              <span 
                className="text-xs font-bold tracking-widest"
                style={{ fontFamily: 'Orbitron, sans-serif', color: '#22c55e' }}
              >
                ACCESS GRANTED
              </span>
            </div>
          </div>

          {/* Non-Transferable Badge */}
          {isNonTransferable && (
            <div 
              className="mx-auto px-4 py-1.5 rounded-full mb-4"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
              }}
            >
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-[10px] font-bold tracking-wider text-red-400" style={{ fontFamily: 'monospace' }}>
                  NO TRANSFERIBLE
                </span>
              </div>
            </div>
          )}

          {/* Participant Info Card */}
          <div 
            className="rounded-xl p-4 mb-4"
            style={{
              background: 'rgba(0, 240, 255, 0.03)',
              border: `1px solid ${primaryColor}20`,
            }}
          >
            <div className="space-y-2.5">
              <InfoRow label="OPERATIVO" value={userName.split(' ')[0].toUpperCase()} color={primaryColor} />
              <InfoRow label="CLEARANCE" value="NIVEL BÁSICO" color={primaryColor} />
              <InfoRow label="STATUS" value="PARTICIPANTE" color="#22c55e" />
              <InfoRow label="MISIÓN" value={eventName.substring(0, 15)} color={accentColor} />
            </div>
          </div>

          {/* QR Section - Flex grow to push to bottom */}
          <div className="flex-grow" />
          
          <div className="text-center">
            <div 
              className="inline-block p-3 rounded-xl mb-2"
              style={{
                background: 'rgba(255,255,255,0.95)',
                boxShadow: `0 0 20px ${primaryColor}30`,
              }}
            >
              <QRCode
                value={ticket.ticketCode || `EVENT:${ticketId}`}
                size={90}
                bgColor="#ffffff"
                fgColor="#0a1929"
                level="H"
              />
            </div>
            
            <p 
              className="text-[11px] tracking-[0.2em] font-mono"
              style={{ color: `${primaryColor}90` }}
            >
              {ticket.ticketCode || `EVT-${ticketId.substring(0, 8).toUpperCase()}`}
            </p>
            <p 
              className="text-[9px] mt-1 opacity-50"
              style={{ color: primaryColor, fontFamily: 'monospace' }}
            >
              PRESENTA ESTE CÓDIGO EN LA ENTRADA
            </p>
          </div>
        </div>

        {/* Bottom Accent Line */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accentColor} 50%, transparent 100%)`,
          }}
        />
      </div>
    </motion.div>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span 
        className="text-[10px] tracking-wider opacity-50"
        style={{ fontFamily: 'monospace', color: '#94a3b8' }}
      >
        {label}
      </span>
      <span 
        className="text-[12px] font-bold tracking-wide"
        style={{ fontFamily: 'Orbitron, sans-serif', color: color }}
      >
        {value}
      </span>
    </div>
  );
}
