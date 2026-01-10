'use client';

import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';

interface QuantumCredentialProps {
  ticket: {
    id: string;
    level: string;
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

// Configuración de colores y niveles
const levelConfig = {
  BASIC: {
    color: '#00F0FF',
    levelText: 'BÁSICO',
    status: 'PARTICIPANTE',
  },
  ADVANCED: {
    color: '#9D4EDD',
    levelText: 'AVANZADO',
    status: 'JUGADOR',
  },
  PL: {
    color: '#FFD700',
    levelText: 'TU VIDA',
    status: 'SALTADOR CUÁNTICO',
  },
  WORKSHOP: {
    color: '#FF006E',
    levelText: 'TALLER',
    status: 'ASISTENTE',
  },
};

export function QuantumCredential({ ticket, userName, userInitials, userPhoto }: QuantumCredentialProps) {
  const isActive = ticket.status === 'ACTIVE';
  const config = levelConfig[ticket.level as keyof typeof levelConfig] || levelConfig.BASIC;
  const primaryColor = isActive ? config.color : '#64748b';
  
  return (
    <motion.div
      className="relative w-[280px] h-[380px]"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Main Card */}
      <div 
        className={`relative w-full h-full rounded-2xl overflow-hidden ${
          isActive ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-black' : 'bg-slate-800/50'
        }`}
        style={{
          boxShadow: isActive 
            ? `0 0 30px ${primaryColor}40, inset 0 1px 0 ${primaryColor}30` 
            : 'none',
          border: '2px solid',
          borderColor: isActive ? primaryColor : '#475569',
        }}
      >
        {/* Circuit Board Pattern Background */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`circuit-${ticket.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M8 8h24M8 8v24M32 8v12M20 20h12M20 20v12" stroke={primaryColor} strokeWidth="0.5" fill="none"/>
                <circle cx="8" cy="8" r="1.5" fill={primaryColor}/>
                <circle cx="32" cy="8" r="1.5" fill={primaryColor}/>
                <circle cx="32" cy="20" r="1.5" fill={primaryColor}/>
                <circle cx="20" cy="20" r="1.5" fill={primaryColor}/>
                <circle cx="20" cy="32" r="1.5" fill={primaryColor}/>
                <circle cx="8" cy="32" r="1.5" fill={primaryColor}/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#circuit-${ticket.id})`}/>
          </svg>
        </div>

        {/* Scan Lines Effect */}
        {isActive && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div 
              className="absolute inset-0 opacity-5"
              style={{
                background: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${primaryColor}20 2px, ${primaryColor}20 4px)`,
              }}
            />
          </div>
        )}

        {/* Header - ACCESS GRANTED */}
        <div className="relative z-10 p-3">
          <div 
            className={`text-center py-1.5 px-3 rounded-lg`}
            style={{
              background: isActive ? `${primaryColor}15` : 'rgba(71, 85, 105, 0.3)',
              border: `1px solid ${isActive ? `${primaryColor}40` : '#475569'}`,
            }}
          >
            <p 
              className="text-[10px] tracking-[0.2em] font-bold"
              style={{ 
                fontFamily: 'monospace',
                color: primaryColor,
              }}
            >
              {isActive ? '▸ ACCESS GRANTED ◂' : '▸ ACCESS EXPIRED ◂'}
            </p>
          </div>
        </div>

        {/* Organization Logo / Hexagon */}
        <div className="relative z-10 flex justify-center my-3">
          <div className="relative">
            {/* Rotating Ring */}
            {isActive && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-2"
              >
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={primaryColor}
                    strokeWidth="1"
                    strokeDasharray="8 4"
                    opacity="0.5"
                  />
                </svg>
              </motion.div>
            )}
            
            {/* Hexagon Container with Participant Photo */}
            <div 
              className="relative w-20 h-20 flex items-center justify-center overflow-hidden"
              style={{
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                background: isActive 
                  ? `linear-gradient(180deg, ${primaryColor}30 0%, ${primaryColor}10 100%)`
                  : 'rgba(71, 85, 105, 0.3)',
              }}
            >
              {userPhoto ? (
                <img 
                  src={userPhoto} 
                  alt={userName}
                  className="w-full h-full object-cover"
                  style={{ 
                    filter: isActive ? `brightness(1.1) drop-shadow(0 0 6px ${primaryColor})` : 'grayscale(100%) opacity(0.5)',
                  }}
                />
              ) : ticket.organization.logoUrl ? (
                <img 
                  src={ticket.organization.logoUrl} 
                  alt={ticket.organization.name}
                  className="w-12 h-12 object-contain"
                  style={{ 
                    filter: isActive ? `brightness(1.2) drop-shadow(0 0 6px ${primaryColor})` : 'grayscale(100%) opacity(0.5)',
                  }}
                />
              ) : (
                <span 
                  className="text-2xl font-black"
                  style={{ 
                    fontFamily: 'Orbitron, sans-serif',
                    color: primaryColor,
                  }}
                >
                  {userInitials}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* User Data */}
        <div className="relative z-10 px-4 space-y-1.5">
          <DataRow label="CODENAME" value={userName.split(' ')[0].toUpperCase()} color={primaryColor} isActive={isActive} />
          <DataRow label="LEVEL" value={config.levelText} color={primaryColor} isActive={isActive} />
          <DataRow label="STATUS" value={config.status} color={primaryColor} isActive={isActive} />
          <DataRow label="VISION" value={ticket.vision.nombre.substring(0, 12)} color={primaryColor} isActive={isActive} />
        </div>

        {/* Bottom Section with QR */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex justify-center">
            <div 
              className="p-2 rounded-lg"
              style={{
                background: isActive ? '#000' : '#1e293b',
                border: `1px solid ${isActive ? primaryColor : '#475569'}`,
              }}
            >
              <QRCode
                value={`TICKET:${ticket.id}`}
                size={70}
                bgColor="transparent"
                fgColor={primaryColor}
                level="M"
              />
            </div>
          </div>
          <p 
            className="text-center text-[9px] mt-1.5 tracking-widest"
            style={{ 
              fontFamily: 'monospace',
              color: isActive ? `${primaryColor}99` : '#64748b',
            }}
          >
            ID: {ticket.id.substring(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Glowing Edge Effect */}
        {isActive && (
          <div 
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow: `inset 0 0 25px ${primaryColor}15`,
            }}
          />
        )}
      </div>
    </motion.div>
  );
}

function DataRow({ label, value, color, isActive }: { label: string; value: string; color: string; isActive: boolean }) {
  return (
    <div className="flex justify-between items-center py-0.5 border-b border-slate-800/50">
      <span 
        className="text-[9px] tracking-wider"
        style={{ 
          fontFamily: 'monospace',
          color: isActive ? '#64748b' : '#475569',
        }}
      >
        {label}:
      </span>
      <span 
        className="text-[11px] font-bold"
        style={{ 
          fontFamily: 'Orbitron, monospace',
          color: isActive ? color : '#64748b',
        }}
      >
        {value}
      </span>
    </div>
  );
}
