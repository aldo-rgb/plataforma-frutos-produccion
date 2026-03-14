'use client';

import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import { AlertTriangle, Shield } from 'lucide-react';

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
  const isNonTransferable = ticket.isTransferable === false;
  
  const primaryColor = '#00F0FF';
  const accentColor = '#9D4EDD';
  const goldColor = '#FFD700';
  const eventName = ticket.product?.name || ticket.vision.nombre;
  const ticketId = ticket.id.replace('event-', '');
  const productImage = ticket.product?.imageUrl;
  
  return (
    <motion.div
      className="relative w-[300px] h-[560px]"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Outer Glow */}
      <div 
        className="absolute -inset-1 rounded-3xl opacity-60 blur-xl"
        style={{
          background: `linear-gradient(135deg, ${goldColor}50 0%, ${accentColor}40 100%)`,
        }}
      />
      
      {/* Main Card */}
      <div 
        className="relative w-full h-full rounded-2xl overflow-hidden"
        style={{
          background: '#000',
          boxShadow: `0 0 0 2px ${primaryColor}60, 0 0 40px ${primaryColor}20`,
        }}
      >
        {/* Product Image Background - Hero Section */}
        <div className="absolute inset-0">
          {productImage ? (
            <>
              <img 
                src={productImage} 
                alt={eventName}
                className="w-full h-[50%] object-cover object-top"
              />
              {/* Gradient Overlay for Image */}
              <div 
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, 
                    rgba(0,0,0,0.2) 0%, 
                    rgba(0,0,0,0.4) 25%,
                    rgba(0,0,0,0.8) 45%, 
                    rgba(5,17,24,1) 50%,
                    rgba(2,10,16,1) 100%)`,
                }}
              />
            </>
          ) : (
            <div 
              className="w-full h-full"
              style={{
                background: 'linear-gradient(180deg, #0a1929 0%, #051118 50%, #020a10 100%)',
              }}
            />
          )}
        </div>

        {/* Grid Background - Bottom Half */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-15">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`grid-${ticket.id}`} x="0" y="0" width="25" height="25" patternUnits="userSpaceOnUse">
                <path d="M25 0L0 0 0 25" fill="none" stroke={primaryColor} strokeWidth="0.3" opacity="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${ticket.id})`}/>
          </svg>
        </div>

        {/* Top Accent Line */}
        <div 
          className="absolute top-0 left-0 right-0 h-1 z-10"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${goldColor} 30%, ${primaryColor} 70%, transparent 100%)`,
          }}
        />

        {/* Corner Brackets */}
        <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 rounded-tl z-10" style={{ borderColor: primaryColor }} />
        <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 rounded-tr z-10" style={{ borderColor: primaryColor }} />
        <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 rounded-bl z-10" style={{ borderColor: primaryColor }} />
        <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 rounded-br z-10" style={{ borderColor: primaryColor }} />

        {/* Status LEDs */}
        <div className="absolute top-4 left-4 flex gap-1.5 z-20">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-lg shadow-cyan-500/50" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col h-full px-5 py-5">
          
          {/* Header */}
          <div className="text-center mb-2">
            <p 
              className="text-[8px] tracking-[0.35em] mb-1 opacity-70"
              style={{ fontFamily: 'monospace', color: primaryColor }}
            >
              ◆ QUANTUM ACCESS PASS ◆
            </p>
            <h1 
              className="text-xl font-black tracking-wider leading-tight"
              style={{ 
                fontFamily: 'Orbitron, sans-serif',
                color: '#fff',
                textShadow: `0 0 30px ${primaryColor}80, 0 2px 10px rgba(0,0,0,0.8)`,
              }}
            >
              {eventName.toUpperCase()}
            </h1>
          </div>

          {/* Spacer to push content down past the image */}
          <div className="h-[120px]" />

          {/* Access Status */}
          <div 
            className="mx-auto px-5 py-1.5 rounded-full mb-2"
            style={{
              background: `linear-gradient(90deg, ${primaryColor}15 0%, ${primaryColor}25 50%, ${primaryColor}15 100%)`,
              border: `1px solid ${primaryColor}50`,
            }}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
              <span 
                className="text-[11px] font-bold tracking-widest"
                style={{ fontFamily: 'Orbitron, sans-serif', color: '#22c55e' }}
              >
                ACCESS GRANTED
              </span>
            </div>
          </div>

          {/* Non-Transferable Badge */}
          {isNonTransferable && (
            <div 
              className="mx-auto px-4 py-1 rounded-full mb-2"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
              }}
            >
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-[9px] font-bold tracking-wider text-red-400" style={{ fontFamily: 'monospace' }}>
                  NO TRANSFERIBLE
                </span>
              </div>
            </div>
          )}

          {/* Participant Info Card */}
          <div 
            className="rounded-xl p-3 mb-3"
            style={{
              background: 'rgba(0, 20, 40, 0.8)',
              border: `1px solid ${primaryColor}30`,
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="space-y-2">
              <InfoRow label="OPERATIVO" value={userName.split(' ')[0].toUpperCase()} color={primaryColor} />
              <InfoRow label="CLEARANCE" value="NIVEL BÁSICO" color={primaryColor} />
              <InfoRow label="STATUS" value="PARTICIPANTE" color="#22c55e" />
              <InfoRow label="MISIÓN" value={eventName.substring(0, 14)} color={accentColor} />
            </div>
          </div>

          {/* QR Section */}
          <div className="text-center mt-auto">
            <div 
              className="inline-block p-2.5 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.97)',
                boxShadow: `0 0 20px ${primaryColor}40`,
              }}
            >
              <QRCode
                value={ticket.ticketCode || `EVENT:${ticketId}`}
                size={75}
                bgColor="#ffffff"
                fgColor="#0a1929"
                level="H"
              />
            </div>
            
            <p 
              className="text-[10px] tracking-[0.15em] font-mono mt-2"
              style={{ color: primaryColor }}
            >
              {ticket.ticketCode || `EVT-${ticketId.substring(0, 8).toUpperCase()}`}
            </p>
            <p 
              className="text-[8px] mt-0.5 opacity-60"
              style={{ color: primaryColor, fontFamily: 'monospace' }}
            >
              PRESENTA EN LA ENTRADA
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
