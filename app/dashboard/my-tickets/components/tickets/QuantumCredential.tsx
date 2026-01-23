'use client';

import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import { CreditCard, AlertTriangle, XCircle, CheckCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface QuantumCredentialProps {
  ticket: {
    id: string;
    level: string;
    status: string;
    type?: string;
    paymentStatus?: string;
    costAtPurchase?: number;
    amountPaid?: number;
    isTransferable?: boolean;
    createdAt: string;
    vision: {
      nombre: string;
      startDate: string;
      advancedStartDate?: string | null;
      advancedEndDate?: string | null;
      plStartDate?: string | null;
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

// Helper function to check if payment deadline has passed
// Payment deadline is 7:00 PM on the day of advancedStartDate
function isPaymentDeadlinePassed(advancedStartDate: string | null | undefined): boolean {
  if (!advancedStartDate) return false;
  
  const advancedDate = new Date(advancedStartDate);
  // Set deadline to 7:00 PM on the advanced start date
  const deadline = new Date(advancedDate);
  deadline.setHours(19, 0, 0, 0);
  
  const now = new Date();
  return now >= deadline;
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
  const isPendingPaymentBase = ticket.status === 'PENDING_PAYMENT' || ticket.paymentStatus === 'PENDING' || ticket.paymentStatus === 'PARTIAL';
  
  // Check if it's a BACKLOG ticket (SCHOLARSHIP type with GIFT payment - cortesía)
  const isBacklogTicket = ticket.type === 'SCHOLARSHIP' && ticket.paymentStatus === 'GIFT';
  const isNonTransferable = ticket.isTransferable === false;
  
  // Check for new PL promo states
  const isPromoAvailable = ticket.status === 'PROMO_AVAILABLE' && ticket.level === 'PL';
  const isReserved = ticket.status === 'RESERVED' && ticket.level === 'PL';
  
  // Check if it's a PL ticket with pending payment and deadline has passed
  const isExpiredPayment = isPendingPaymentBase && ticket.level === 'PL' && isPaymentDeadlinePassed(ticket.vision.advancedStartDate);
  const isPendingPayment = (isPendingPaymentBase || isPromoAvailable || isReserved) && !isExpiredPayment;
  
  const config = levelConfig[ticket.level as keyof typeof levelConfig] || levelConfig.BASIC;
  
  // Determine primary color based on state
  let primaryColor = isActive ? config.color : isPendingPayment ? '#f97316' : isExpiredPayment ? '#ef4444' : '#64748b';
  if (isPromoAvailable) primaryColor = '#06b6d4'; // Cyan for promo available
  if (isReserved) primaryColor = '#10b981'; // Green for reserved
  
  const pendingAmount = (ticket.costAtPurchase || 0) - (ticket.amountPaid || 0);
  
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
              background: isActive ? `${primaryColor}15` : isPendingPayment ? 'rgba(249, 115, 22, 0.15)' : isExpiredPayment ? 'rgba(239, 68, 68, 0.15)' : 'rgba(71, 85, 105, 0.3)',
              border: `1px solid ${isActive ? `${primaryColor}40` : isPendingPayment ? '#f9731540' : isExpiredPayment ? '#ef444440' : '#475569'}`,
            }}
          >
            <p 
              className="text-[10px] tracking-[0.2em] font-bold"
              style={{ 
                fontFamily: 'monospace',
                color: primaryColor,
              }}
            >
              {isActive ? '▸ ACCESS GRANTED ◂' : isPromoAvailable ? '▸ PROMO DISPONIBLE ◂' : isReserved ? '▸ LUGAR RESERVADO ◂' : isPendingPayment ? '▸ PAGO PENDIENTE ◂' : isExpiredPayment ? '▸ TICKET EXPIRADO ◂' : '▸ ACCESS EXPIRED ◂'}
            </p>
          </div>
          
          {/* BACKLOG Badge - Ticket de Reposición */}
          {isBacklogTicket && (
            <div 
              className="mt-2 text-center py-1 px-2 rounded"
              style={{
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
              }}
            >
              <p 
                className="text-[9px] tracking-wider font-bold"
                style={{ 
                  fontFamily: 'monospace',
                  color: '#22c55e',
                }}
              >
                🎫 TICKET DE REPOSICIÓN
              </p>
            </div>
          )}
          
          {/* Non-Transferable Warning */}
          {isNonTransferable && (
            <div 
              className="mt-1 text-center py-0.5 px-2 rounded"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <p 
                className="text-[8px] tracking-wider font-bold flex items-center justify-center gap-1"
                style={{ 
                  fontFamily: 'monospace',
                  color: '#ef4444',
                }}
              >
                <AlertTriangle className="w-2.5 h-2.5" />
                NO TRANSFERIBLE
              </p>
            </div>
          )}
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
          <DataRow label="CODENAME" value={userName.split(' ')[0].toUpperCase()} color={primaryColor} isActive={isActive || isPendingPayment || isExpiredPayment || isPromoAvailable || isReserved} />
          <DataRow label="LEVEL" value={config.levelText} color={primaryColor} isActive={isActive || isPendingPayment || isExpiredPayment || isPromoAvailable || isReserved} />
          <DataRow label="STATUS" value={isPromoAvailable ? 'PROMO $9,000' : isReserved ? 'RESERVADO' : isPendingPayment ? 'PAGO PENDIENTE' : isExpiredPayment ? 'EXPIRADO' : config.status} color={primaryColor} isActive={isActive || isPendingPayment || isExpiredPayment || isPromoAvailable || isReserved} />
          <DataRow label="VISION" value={ticket.vision.nombre.substring(0, 12)} color={primaryColor} isActive={isActive || isPendingPayment || isExpiredPayment || isPromoAvailable || isReserved} />
          {/* Fecha según nivel */}
          {(() => {
            // Para BASIC: mostrar fecha de inicio básico
            if (ticket.level === 'BASIC' && ticket.vision.startDate) {
              const date = new Date(ticket.vision.startDate);
              const formatted = date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).toUpperCase();
              return <DataRow label="FECHA" value={formatted} color={primaryColor} isActive={isActive || isPendingPayment || isExpiredPayment} />;
            }
            // Para ADVANCED: mostrar fecha de inicio avanzado
            if (ticket.level === 'ADVANCED' && ticket.vision.advancedStartDate) {
              const date = new Date(ticket.vision.advancedStartDate);
              const formatted = date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).toUpperCase();
              return <DataRow label="FECHA" value={formatted} color={primaryColor} isActive={isActive || isPendingPayment || isExpiredPayment} />;
            }
            // Para PL: mostrar fecha solo si ya terminó el avanzado
            if (ticket.level === 'PL') {
              const advEndDate = ticket.vision.advancedEndDate ? new Date(ticket.vision.advancedEndDate) : null;
              const now = new Date();
              // Solo mostrar si el avanzado ya terminó
              if (advEndDate && now > advEndDate && ticket.vision.plStartDate) {
                const date = new Date(ticket.vision.plStartDate);
                const formatted = date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).toUpperCase();
                return <DataRow label="FECHA" value={formatted} color={primaryColor} isActive={isActive || isPendingPayment || isExpiredPayment || isPromoAvailable || isReserved} />;
              }
              // Si aún no termina avanzado, mostrar "PRÓXIMAMENTE"
              return <DataRow label="FECHA" value="PRÓXIMAMENTE" color={primaryColor} isActive={isActive || isPendingPayment || isExpiredPayment || isPromoAvailable || isReserved} />;
            }
            return null;
          })()}
        </div>

        {/* Bottom Section - QR, Payment Button, or Expired Message */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {isPromoAvailable ? (
            /* Promo Available - Show deposit button */
            <div className="space-y-2">
              <div 
                className="p-2 rounded-lg text-center"
                style={{
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                }}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span className="text-[10px] text-cyan-400 font-bold tracking-wide" style={{ fontFamily: 'monospace' }}>
                    PRECIO PROMO DISPONIBLE
                  </span>
                </div>
                <p className="text-lg font-black text-cyan-400" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  $9,000 MXN
                </p>
                <p className="text-[10px] text-cyan-400/70 mt-0.5" style={{ fontFamily: 'monospace' }}>
                  Reserva con $1,500 • Precio base: $11,000
                </p>
              </div>
              
              <Link 
                href="/dashboard/pay-pl"
                className="block w-full"
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer text-white"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                    boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)',
                    fontFamily: 'Orbitron, sans-serif',
                  }}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>VER OPCIONES</span>
                </motion.div>
              </Link>
            </div>
          ) : isReserved ? (
            /* Reserved - Show remaining payment button */
            <div className="space-y-2">
              <div 
                className="p-2 rounded-lg text-center"
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                }}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-[10px] text-green-400 font-bold tracking-wide" style={{ fontFamily: 'monospace' }}>
                    PROMO RESERVADA
                  </span>
                </div>
                <p className="text-lg font-black text-green-400" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  Saldo: $7,500 MXN
                </p>
                <p className="text-[10px] text-green-400/70 mt-0.5" style={{ fontFamily: 'monospace' }}>
                  Depósito: $1,500 ✓ • Precio promo asegurado
                </p>
              </div>
              
              <Link 
                href="/dashboard/pay-pl"
                className="block w-full"
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer text-white"
                  style={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
                    fontFamily: 'Orbitron, sans-serif',
                  }}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>PAGAR SALDO</span>
                </motion.div>
              </Link>
            </div>
          ) : isExpiredPayment ? (
            /* Expired Payment Section */
            <div className="space-y-2">
              <div 
                className="p-2 rounded-lg text-center"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <XCircle className="w-3 h-3 text-red-400" />
                  <span className="text-[10px] text-red-400 font-bold tracking-wide" style={{ fontFamily: 'monospace' }}>
                    PLAZO VENCIDO
                  </span>
                </div>
                <p className="text-xs text-red-400/80 mt-1" style={{ fontFamily: 'monospace' }}>
                  El plazo para pagar este ticket ha expirado
                </p>
              </div>
              
              <div
                className="w-full py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 text-gray-500 bg-gray-800/50"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                <CreditCard className="w-4 h-4" />
                <span>NO DISPONIBLE</span>
              </div>
            </div>
          ) : isPendingPayment ? (
            /* Payment Section for Pending Tickets */
            <div className="space-y-2">
              <div 
                className="p-2 rounded-lg text-center"
                style={{
                  background: 'rgba(249, 115, 22, 0.1)',
                  border: '1px solid rgba(249, 115, 22, 0.3)',
                }}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3 h-3 text-orange-400" />
                  <span className="text-[10px] text-orange-400 font-bold tracking-wide" style={{ fontFamily: 'monospace' }}>
                    PAGO PENDIENTE
                  </span>
                </div>
                <p className="text-lg font-black text-orange-400" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  ${pendingAmount.toLocaleString()} MXN
                </p>
              </div>
              
              <Link 
                href={`/dashboard/checkout-ticket?ticketId=${ticket.id}`}
                className="block w-full"
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer text-white"
                  style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    boxShadow: '0 4px 15px rgba(249, 115, 22, 0.4)',
                    fontFamily: 'Orbitron, sans-serif',
                  }}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>PAGAR AHORA</span>
                </motion.div>
              </Link>
            </div>
          ) : (
            /* QR Section for Active/Expired Tickets */
            <>
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
            </>
          )}
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
