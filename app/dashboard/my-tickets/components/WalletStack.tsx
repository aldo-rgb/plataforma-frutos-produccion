'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { QuantumCredential } from './tickets/QuantumCredential';
import { EventTicket } from './tickets/EventTicket';

interface Ticket {
  id: string;
  type: string;
  level: string;
  status: string;
  paymentStatus: string;
  costAtPurchase?: number;
  amountPaid?: number;
  isTransferable: boolean;
  validUntil: string | null;
  purchasePrice: number | null;
  createdAt: string;
  ticketCode?: string;
  vision: {
    id: number;
    nombre: string;
    startDate: string;
    endDate: string | null;
    advancedStartDate?: string | null;
    advancedEndDate?: string | null;
    plStartDate?: string | null;
  };
  organization: {
    name: string;
    logoUrl: string | null;
  };
  product: {
    id: number;
    name: string;
    imageUrl: string | null;
    description: string | null;
    location: string | null;
    type: string;
  } | null;
}

interface User {
  id: number;
  name: string;
  initials: string;
  photo: string | null;
  memberSince: string;
}

interface WalletStackProps {
  tickets: Ticket[];
  user: User | null;
  onTransfer: (ticket: Ticket) => void;
}

export function WalletStack({ tickets, user, onTransfer }: WalletStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Orden de niveles: BASIC primero, luego ADVANCED, luego PL, EVENT al final
  const levelOrder: Record<string, number> = {
    'BASIC': 1,
    'ADVANCED': 2,
    'PL': 3,
    'WORKSHOP': 4,
    'EVENT': 5,
  };

  // Orden de status: ACTIVE y PENDING_PAYMENT primero, USED y otros al final
  const statusOrder: Record<string, number> = {
    'ACTIVE': 1,
    'PENDING_PAYMENT': 2,
    'RESERVED': 3,
    'PENDING': 4,
    'USED': 10,
    'EXPIRED': 11,
    'CANCELLED': 12,
    'TRANSFERRED': 13,
  };

  // Función para verificar si un ticket ya fue "usado" (evento ya pasó)
  const isTicketUsed = (ticket: Ticket): boolean => {
    if (statusOrder[ticket.status] >= 10) return true;
    
    if (ticket.vision?.endDate) {
      const endDate = new Date(ticket.vision.endDate);
      const now = new Date();
      if (endDate < now) return true;
    }
    
    return false;
  };
  
  // Ordenar tickets: primero por si fue usado (no usados arriba), luego por nivel
  const sortedTickets = [...tickets].sort((a, b) => {
    const usedA = isTicketUsed(a);
    const usedB = isTicketUsed(b);
    
    if (usedA !== usedB) {
      return usedA ? 1 : -1;
    }
    
    const statusA = statusOrder[a.status] || 5;
    const statusB = statusOrder[b.status] || 5;
    if (statusA !== statusB) {
      return statusA - statusB;
    }
    
    const orderA = levelOrder[a.level] || 99;
    const orderB = levelOrder[b.level] || 99;
    return orderA - orderB;
  });

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < sortedTickets.length - 1) {
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Swipe handlers
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
  };

  if (sortedTickets.length === 0) return null;

  const currentTicket = sortedTickets[currentIndex];
  
  // Check if it's an event ticket
  const isEventTicket = currentTicket.level === 'EVENT' || currentTicket.type === 'EVENT' || currentTicket.id.startsWith('event-');
  
  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'BASIC': return 'Básico';
      case 'ADVANCED': return 'Avanzado';
      case 'PL': return 'Tu Vida';
      case 'EVENT': return 'Evento';
      default: return level;
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Indicador de nivel y navegación */}
      <div className="flex items-center justify-center gap-4 mb-6">
        {/* Botón anterior */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className={`p-3 rounded-full transition-all ${
            currentIndex === 0
              ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#00F0FF]/20 to-[#9D4EDD]/20 text-[#00F0FF] hover:from-[#00F0FF]/30 hover:to-[#9D4EDD]/30 border border-[#00F0FF]/30'
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </motion.button>

        {/* Contador de tickets */}
        <div className="flex items-center gap-3">
          <span 
            className="text-2xl font-black text-white"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {currentIndex + 1}
          </span>
          <span className="text-slate-500">/</span>
          <span className="text-lg text-slate-400">{sortedTickets.length}</span>
        </div>

        {/* Botón siguiente */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={goToNext}
          disabled={currentIndex === sortedTickets.length - 1}
          className={`p-3 rounded-full transition-all ${
            currentIndex === sortedTickets.length - 1
              ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#9D4EDD]/20 to-[#FFD700]/20 text-[#FFD700] hover:from-[#9D4EDD]/30 hover:to-[#FFD700]/30 border border-[#FFD700]/30'
          }`}
        >
          <ChevronRight className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Indicadores de puntos */}
      <div className="flex gap-2 mb-6">
        {sortedTickets.map((ticket, index) => (
          <button
            key={ticket.id}
            onClick={() => {
              setDirection(index > currentIndex ? 1 : -1);
              setCurrentIndex(index);
            }}
            className={`transition-all duration-300 rounded-full ${
              index === currentIndex
                ? 'w-8 h-2 bg-gradient-to-r from-[#00F0FF] to-[#9D4EDD]'
                : 'w-2 h-2 bg-slate-600 hover:bg-slate-500'
            }`}
          />
        ))}
      </div>

      {/* Contenedor del carrusel */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-sm h-[480px] overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentTicket.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
            }}
            className="absolute inset-0 flex justify-center"
          >
            {isEventTicket ? (
              <EventTicket
                ticket={currentTicket}
                userName={user?.name || 'Usuario'}
                userInitials={user?.initials || 'US'}
                userPhoto={user?.photo}
              />
            ) : (
              <QuantumCredential
                ticket={currentTicket}
                userName={user?.name || 'Usuario'}
                userInitials={user?.initials || 'US'}
                userPhoto={user?.photo}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Etiqueta del nivel actual */}
      <motion.div
        key={currentTicket.id + '-label'}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 text-center"
      >
        <span 
          className={`px-4 py-2 rounded-full text-sm font-bold ${
            currentTicket.level === 'BASIC' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : currentTicket.level === 'ADVANCED'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : currentTicket.level === 'EVENT' || isEventTicket
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          }`}
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          {isEventTicket ? (currentTicket.product?.name || 'Evento') : getLevelLabel(currentTicket.level)}
        </span>
        <p className="mt-2 text-slate-400 text-sm">
          {currentTicket.vision.nombre}
        </p>
      </motion.div>

      {/* Instrucciones de navegación */}
      <p className="mt-6 text-slate-500 text-xs text-center">
        Desliza o usa las flechas para ver más tickets
      </p>
    </div>
  );
}
