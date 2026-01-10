'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuantumCredential } from './tickets/QuantumCredential';

interface Ticket {
  id: string;
  type: string;
  level: string;
  status: string;
  paymentStatus: string;
  isTransferable: boolean;
  validUntil: string | null;
  purchasePrice: number | null;
  createdAt: string;
  vision: {
    id: number;
    nombre: string;
    startDate: string;
    endDate: string | null;
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
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  // Orden de niveles: BASIC primero, luego ADVANCED, luego PL
  const levelOrder: Record<string, number> = {
    'BASIC': 1,
    'ADVANCED': 2,
    'PL': 3,
    'WORKSHOP': 4,
  };
  
  // Ordenar tickets por nivel
  const sortedTickets = [...tickets].sort((a, b) => {
    const orderA = levelOrder[a.level] || 99;
    const orderB = levelOrder[b.level] || 99;
    return orderA - orderB;
  });
  
  // Altura visible de cada tarjeta cuando está colapsada (solo el header)
  const COLLAPSED_HEIGHT = 70;
  // Altura total de la tarjeta
  const CARD_HEIGHT = 380;
  // Ancho de la tarjeta
  const CARD_WIDTH = 280;

  const handleCardClick = (index: number) => {
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else {
      setExpandedIndex(index);
    }
  };

  // Calcular la posición Y de cada tarjeta
  const getCardY = (index: number) => {
    if (expandedIndex === null) {
      // Todas colapsadas - stack mode
      return index * COLLAPSED_HEIGHT;
    }
    
    if (index <= expandedIndex) {
      // Tarjetas antes o en la expandida
      return index * COLLAPSED_HEIGHT;
    } else {
      // Tarjetas después de la expandida - empujar hacia abajo
      return expandedIndex * COLLAPSED_HEIGHT + CARD_HEIGHT + 20 + (index - expandedIndex - 1) * COLLAPSED_HEIGHT;
    }
  };

  // Altura total del contenedor - calcular correctamente para evitar problemas de scroll
  const getContainerHeight = () => {
    const numTickets = sortedTickets.length;
    if (numTickets === 0) return 0;
    
    if (expandedIndex === null) {
      // Todas colapsadas: altura de las tarjetas apiladas + la última visible completa
      return (numTickets - 1) * COLLAPSED_HEIGHT + CARD_HEIGHT + 40;
    } else {
      // Una expandida: calcular altura total necesaria
      const ticketsBeforeExpanded = expandedIndex;
      const ticketsAfterExpanded = numTickets - expandedIndex - 1;
      return ticketsBeforeExpanded * COLLAPSED_HEIGHT + CARD_HEIGHT + 20 + ticketsAfterExpanded * COLLAPSED_HEIGHT + CARD_HEIGHT + 40;
    }
  };

  return (
    <div className="flex justify-center w-full px-4 pb-10">
      <div 
        className="relative transition-all duration-300"
        style={{ 
          width: CARD_WIDTH,
          minHeight: getContainerHeight(),
        }}
      >
        <AnimatePresence>
          {sortedTickets.map((ticket, index) => {
            const isExpanded = expandedIndex === index;
            const zIndex = expandedIndex === index ? 100 : sortedTickets.length - index;
            
            return (
              <motion.div
                key={ticket.id}
                className="absolute left-0 cursor-pointer"
                style={{ 
                  zIndex,
                  width: CARD_WIDTH,
                }}
                initial={{ y: index * COLLAPSED_HEIGHT, opacity: 0 }}
                animate={{ 
                  y: getCardY(index),
                  opacity: 1,
                  scale: isExpanded ? 1.02 : 1,
                }}
                transition={{ 
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
                onClick={() => handleCardClick(index)}
                whileHover={{ scale: isExpanded ? 1.02 : 1.01 }}
              >
                {/* Sombra para efecto de profundidad */}
                <div 
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    boxShadow: isExpanded 
                      ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
                      : '0 10px 30px -5px rgba(0, 0, 0, 0.3)',
                  }}
                />
                
                <QuantumCredential
                  ticket={ticket}
                  userName={user?.name || 'Usuario'}
                  userInitials={user?.initials || 'US'}
                  userPhoto={user?.photo}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
