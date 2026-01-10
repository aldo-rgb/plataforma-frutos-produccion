'use client';

import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import Barcode from 'react-barcode';

interface AdvancedTicketProps {
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

export function AdvancedTicket({ ticket, userName, userInitials, userPhoto }: AdvancedTicketProps) {
  const isActive = ticket.status === 'ACTIVE';
  const startDate = new Date(ticket.vision.startDate);
  const formattedDate = startDate.toLocaleDateString('es-MX', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  }).toUpperCase();
  const formattedTime = startDate.toLocaleTimeString('es-MX', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Generate flight number from vision name
  const flightNumber = `QA-${ticket.vision.nombre.substring(0, 3).toUpperCase()}${Math.floor(Math.random() * 900) + 100}`;
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      className="relative w-[520px] h-[200px]"
    >
      {/* Main Boarding Pass Container */}
      <div 
        className={`relative w-full h-full flex rounded-xl overflow-hidden ${
          isActive ? 'bg-gradient-to-r from-[#1a0a2e] via-[#16082a] to-[#0d0518]' : 'bg-slate-800/50'
        }`}
        style={{
          boxShadow: isActive 
            ? '0 0 40px rgba(157, 78, 221, 0.3), 0 20px 60px rgba(0, 0, 0, 0.5)' 
            : 'none',
          border: '2px solid',
          borderColor: isActive ? '#9D4EDD' : '#475569',
        }}
      >
        {/* Main Section (Left) */}
        <div className="flex-1 p-5 relative">
          {/* Background Stars */}
          <div className="absolute inset-0 overflow-hidden opacity-30">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.8 + 0.2,
                }}
              />
            ))}
          </div>

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#9D4EDD] to-[#FF006E] flex items-center justify-center">
                <span className="text-white text-lg">✈</span>
              </div>
              <div>
                <p 
                  className={`text-sm font-bold tracking-wider ${isActive ? 'text-[#9D4EDD]' : 'text-slate-500'}`}
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  QUANTUM AIRLINES
                </p>
                <p className="text-[10px] text-slate-500">{ticket.organization.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p 
                className={`text-lg font-black ${isActive ? 'text-white' : 'text-slate-500'}`}
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {flightNumber}
              </p>
              <p className="text-[10px] text-slate-500">FLIGHT NUMBER</p>
            </div>
          </div>

          {/* Route Section */}
          <div className="relative z-10 flex items-center gap-4 mb-4">
            {/* Origin */}
            <div className="flex-1">
              <p className="text-[10px] text-slate-500 mb-1">ORIGIN</p>
              <p 
                className={`text-lg font-bold ${isActive ? 'text-[#FF006E]' : 'text-slate-500'}`}
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                COMFORT ZONE
              </p>
              <p className="text-[10px] text-slate-600">ZON</p>
            </div>

            {/* Flight Path */}
            <div className="flex-shrink-0 w-24 relative">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-[#FF006E] via-[#9D4EDD] to-[#00F0FF]" />
              <motion.div
                animate={{ x: [0, 80, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute top-1/2 -translate-y-1/2 text-lg"
              >
                ✈️
              </motion.div>
            </div>

            {/* Destination */}
            <div className="flex-1 text-right">
              <p className="text-[10px] text-slate-500 mb-1">DESTINATION</p>
              <p 
                className={`text-lg font-bold ${isActive ? 'text-[#00F0FF]' : 'text-slate-500'}`}
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                IMPOSSIBLE
              </p>
              <p className="text-[10px] text-slate-600">FUT</p>
            </div>
          </div>

          {/* Details Row */}
          <div className="relative z-10 flex gap-6">
            <DetailBox label="PASSENGER" value={userName.split(' ')[0].toUpperCase()} isActive={isActive} />
            <DetailBox label="GATE" value="02" isActive={isActive} />
            <DetailBox label="SEAT" value="VIP" isActive={isActive} highlight />
            <DetailBox label="BOARDING" value={formattedTime} isActive={isActive} />
          </div>

          {/* Barcode */}
          <div className="absolute bottom-2 left-4 right-4 flex justify-center opacity-60">
            <div className="transform scale-[0.6] origin-center">
              <Barcode 
                value={ticket.id.substring(0, 12)} 
                width={1.5}
                height={30}
                displayValue={false}
                background="transparent"
                lineColor={isActive ? '#9D4EDD' : '#475569'}
              />
            </div>
          </div>
        </div>

        {/* Tear Line */}
        <div className="relative w-[2px] flex flex-col justify-between py-4">
          <div className="w-4 h-4 rounded-full bg-slate-950 -ml-2"></div>
          <div 
            className="flex-1 mx-auto border-l-2 border-dashed"
            style={{ borderColor: isActive ? 'rgba(157, 78, 221, 0.3)' : '#334155' }}
          />
          <div className="w-4 h-4 rounded-full bg-slate-950 -ml-2"></div>
        </div>

        {/* Stub Section (Right) */}
        <div className="w-[140px] p-4 flex flex-col items-center justify-center relative">
          {/* Organization Logo or Initials */}
          <div className="mb-3">
            {ticket.organization.logoUrl ? (
              <img 
                src={ticket.organization.logoUrl} 
                alt={ticket.organization.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9D4EDD] to-[#FF006E] flex items-center justify-center">
                <span className="text-white font-bold text-xs">
                  {ticket.organization.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div 
            className="p-2 rounded-lg mb-2"
            style={{
              background: '#000',
              border: `1px solid ${isActive ? '#9D4EDD' : '#475569'}`,
            }}
          >
            <QRCode
              value={`TICKET:${ticket.id}`}
              size={60}
              bgColor="transparent"
              fgColor={isActive ? '#9D4EDD' : '#64748b'}
              level="M"
            />
          </div>

          {/* Date */}
          <p 
            className={`text-[10px] font-bold tracking-wider ${isActive ? 'text-white' : 'text-slate-500'}`}
            style={{ fontFamily: 'monospace' }}
          >
            {formattedDate}
          </p>
          <p className="text-[8px] text-slate-600 mt-1">{ticket.vision.nombre.substring(0, 12)}</p>
        </div>
      </div>
    </motion.div>
  );
}

function DetailBox({ 
  label, 
  value, 
  isActive, 
  highlight = false 
}: { 
  label: string; 
  value: string; 
  isActive: boolean; 
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[8px] text-slate-600 mb-0.5">{label}</p>
      <p 
        className={`text-sm font-bold ${
          highlight && isActive 
            ? 'text-[#FFD700]' 
            : isActive 
              ? 'text-white' 
              : 'text-slate-500'
        }`}
        style={{ fontFamily: 'Orbitron, monospace' }}
      >
        {value}
      </p>
    </div>
  );
}
