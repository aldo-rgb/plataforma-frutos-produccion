'use client';

import { useEffect, useState } from 'react';
import { formatUTCForUser, getUserTimeZone } from '@/utils/timezone';
import { Clock } from 'lucide-react';

interface TimeDisplayProps {
  utcDate: Date | string;
  format?: string;
  showTimezone?: boolean;
  className?: string;
}

/**
 * Componente que muestra automáticamente una hora UTC
 * en la zona horaria local del usuario
 */
export default function TimeDisplay({ 
  utcDate, 
  format = 'h:mm a',
  showTimezone = true,
  className = ''
}: TimeDisplayProps) {
  const [timeZone, setTimeZone] = useState<string>('');
  const [formattedTime, setFormattedTime] = useState<string>('');

  useEffect(() => {
    // Solo ejecutar en el cliente
    const tz = getUserTimeZone();
    setTimeZone(tz);
    setFormattedTime(formatUTCForUser(utcDate, format, tz));
  }, [utcDate, format]);

  if (!formattedTime) {
    return <span className={className}>Cargando...</span>;
  }

  return (
    <span className={className}>
      {formattedTime}
      {showTimezone && (
        <span className="text-xs text-gray-500 ml-1">
          ({timeZone.split('/')[1]?.replace('_', ' ')})
        </span>
      )}
    </span>
  );
}

/**
 * Componente para mostrar fecha completa con zona horaria
 */
export function DateTimeDisplay({ 
  utcDate,
  showIcon = true,
  className = ''
}: { 
  utcDate: Date | string;
  showIcon?: boolean;
  className?: string;
}) {
  const [formattedDateTime, setFormattedDateTime] = useState<string>('');
  const [timeZone, setTimeZone] = useState<string>('');

  useEffect(() => {
    const tz = getUserTimeZone();
    setTimeZone(tz);
    setFormattedDateTime(formatUTCForUser(utcDate, 'PPP p', tz));
  }, [utcDate]);

  if (!formattedDateTime) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && <Clock className="w-4 h-4 text-purple-400" />}
      <div>
        <div className="text-white">{formattedDateTime}</div>
        <div className="text-xs text-gray-500">Tu hora local ({timeZone})</div>
      </div>
    </div>
  );
}
