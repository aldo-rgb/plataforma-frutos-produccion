'use client';

import { useState, useEffect } from 'react';
import { Bell, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function NotificacionSesionesPendientes() {
  const [pendientes, setPendientes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarPendientes = async () => {
      try {
        const res = await fetch('/api/mentor/solicitudes/pendientes');
        const data = await res.json();
        
        if (data.success) {
          setPendientes(data.count);
        }
      } catch (error) {
        console.error('Error al cargar pendientes:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarPendientes();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(cargarPendientes, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading || pendientes === 0) return null;

  return (
    <Link href="/dashboard/mentor/sesiones">
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/50 rounded-xl p-4 hover:border-yellow-400 transition-all cursor-pointer group animate-pulse hover:animate-none">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-6 h-6 text-yellow-400 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {pendientes}
            </span>
          </div>
          
          <div className="flex-1">
            <h4 className="text-white font-bold text-sm group-hover:text-yellow-400 transition-colors">
              {pendientes === 1 ? 'Nueva solicitud de mentoría' : `${pendientes} solicitudes pendientes`}
            </h4>
            <p className="text-slate-400 text-xs">
              Click para revisar y confirmar
            </p>
          </div>

          <Calendar className="w-5 h-5 text-yellow-400 opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </Link>
  );
}
