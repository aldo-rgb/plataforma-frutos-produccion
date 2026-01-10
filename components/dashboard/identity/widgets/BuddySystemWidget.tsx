'use client';

import { motion } from 'framer-motion';
import { Users, MessageCircle, Phone, ExternalLink } from 'lucide-react';
import Image from 'next/image';

interface BuddyInfo {
  id: number;
  nombre: string;
  apodo?: string;
  profileImage?: string | null;
  telefono?: string | null;
}

interface BuddySystemWidgetProps {
  buddy?: BuddyInfo | null;
}

export default function BuddySystemWidget({ buddy }: BuddySystemWidgetProps) {
  if (!buddy) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/20 via-slate-900 to-slate-900 border border-purple-500/20 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/30">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Buddy System</h3>
            <p className="text-xs text-slate-400">Tu compañero de camino</p>
          </div>
        </div>
        
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-3">
            <Users className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-sm text-slate-400">
            Tu buddy será asignado durante el fin de semana Avanzado
          </p>
        </div>
      </motion.div>
    );
  }

  const initials = buddy.nombre
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const whatsappLink = buddy.telefono 
    ? `https://wa.me/${buddy.telefono.replace(/\D/g, '')}` 
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-900/20 via-slate-900 to-slate-900 border border-purple-500/30 rounded-2xl p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/30">
          <Users className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Buddy System</h3>
          <p className="text-xs text-slate-400">Tu compañero de camino</p>
        </div>
      </div>

      {/* Buddy Card */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            {buddy.profileImage ? (
              <Image
                src={buddy.profileImage}
                alt={buddy.nombre}
                width={56}
                height={56}
                className="rounded-full object-cover ring-2 ring-purple-500/50"
              />
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-purple-500/50">
                <span className="text-lg font-bold text-white">{initials}</span>
              </div>
            )}
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800" />
          </div>

          {/* Info */}
          <div className="flex-1">
            <h4 className="font-semibold text-white">{buddy.apodo || buddy.nombre}</h4>
            <p className="text-xs text-slate-400">{buddy.nombre}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {whatsappLink && (
            <motion.a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-400 text-sm font-medium transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </motion.a>
          )}
          {buddy.telefono && (
            <motion.a
              href={`tel:${buddy.telefono}`}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-400 text-sm font-medium transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Phone className="w-4 h-4" />
            </motion.a>
          )}
        </div>
      </div>

      {/* Tip */}
      <p className="text-xs text-slate-500 mt-3 text-center">
        💡 Conecta con tu buddy al menos 1 vez por semana
      </p>
    </motion.div>
  );
}
