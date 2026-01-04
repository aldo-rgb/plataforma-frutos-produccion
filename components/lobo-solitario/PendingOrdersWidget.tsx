'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CreditCard, Clock, Package, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PendingOrder {
  id: number;
  plan: string;
  frecuencia: string;
  cantidadSesiones: number;
  precioTotal: number;
  mentorNombre: string;
  createdAt: string;
  expiresAt: string;
}

export default function PendingOrdersWidget() {
  const router = useRouter();
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      const res = await fetch('/api/lobo-solitario/ordenes-pendientes');
      if (res.ok) {
        const data = await res.json();
        setPendingOrders(data.ordenes || []);
      }
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToPayment = (ordenId: number) => {
    router.push(`/dashboard/lobo-solitario/procesar-pago?ordenId=${ordenId}`);
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Expirando...';
    if (diffMins < 60) return `${diffMins} min restantes`;
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m restantes`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mb-10 bg-gradient-to-r from-orange-900/20 to-red-900/20 border border-orange-500/30 rounded-2xl p-6 animate-pulse">
        <div className="h-20 bg-slate-700/20 rounded"></div>
      </div>
    );
  }

  if (pendingOrders.length === 0) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto mb-10">
      {pendingOrders.map((order) => (
        <div 
          key={order.id}
          className="bg-gradient-to-r from-orange-900/30 to-red-900/20 border-2 border-orange-500/50 rounded-2xl p-6 shadow-2xl shadow-orange-500/20 mb-4"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-orange-500/20 border-2 border-orange-500/40 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-7 h-7 text-orange-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="text-orange-400" size={18} />
                  <h3 className="text-xl font-bold text-white">Pago Pendiente</h3>
                </div>
                <p className="text-slate-300 text-sm mb-1">
                  Orden #{order.id} • {order.plan} {order.frecuencia}
                </p>
                <p className="text-slate-400 text-xs">
                  {order.cantidadSesiones} sesiones con {order.mentorNombre}
                </p>
              </div>
            </div>

            {/* Precio */}
            <div className="text-right">
              <p className="text-xs text-slate-400 mb-1">Total</p>
              <p className="text-2xl font-bold text-white">
                ${order.precioTotal.toLocaleString('es-MX')}
              </p>
              <p className="text-xs text-slate-500">MXN</p>
            </div>
          </div>

          {/* Time Warning */}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-orange-400 font-semibold text-sm mb-1">
                  {getTimeRemaining(order.expiresAt)}
                </p>
                <p className="text-slate-400 text-xs">
                  Esta orden expirará automáticamente si no se completa el pago. 
                  Podrás crear una nueva orden después de 30 minutos.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => handleGoToPayment(order.id)}
            className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl font-bold transition-all duration-200 shadow-lg shadow-orange-500/30 flex items-center justify-center gap-3 group"
          >
            <CreditCard className="w-5 h-5" />
            Completar Pago Ahora
            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Created date */}
          <p className="text-center text-slate-500 text-xs mt-3">
            Creada el {new Date(order.createdAt).toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      ))}
    </div>
  );
}
