'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMultiLevelTranslations } from '@/lib/i18n/multi-level';

interface FinancialPanelProps {
  organizationId: number;
  locale?: 'es' | 'en';
}

export default function FinancialPanel({ organizationId, locale = 'es' }: FinancialPanelProps) {
  const t = useMultiLevelTranslations(locale).finances;
  
  const [stripeStatus, setStripeStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  
  const [ticketForm, setTicketForm] = useState({
    level: 'BASIC',
    nombre: '',
    nombreEn: '',
    descripcion: '',
    descripcionEn: '',
    precio: '',
    precioUSD: '',
    cupo: '',
  });

  useEffect(() => {
    loadStripeStatus();
    loadTickets();
  }, []);

  const loadStripeStatus = async () => {
    try {
      const response = await fetch('/api/stripe/connect');
      if (response.ok) {
        const data = await response.json();
        setStripeStatus(data);
      }
    } catch (error) {
      console.error('Error cargando estado de Stripe:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    // TODO: Cargar tickets desde la API
  };

  const handleConnectStripe = async () => {
    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        alert('Error al conectar con Stripe');
      }
    } catch (error) {
      console.error('Error conectando Stripe:', error);
      alert('Error al conectar con Stripe');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implementar creación de tickets
    alert('Funcionalidad en desarrollo');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          💰 {t.title}
        </h1>
        <p className="text-gray-400">
          Gestión de pagos, productos y reportes financieros
        </p>
      </div>

      {/* Stripe Connect Status */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Estado de Stripe Connect
            </h3>
            {stripeStatus?.connected ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <span className="text-green-400 font-semibold">{t.stripeConnected}</span>
                </div>
                <div className="text-sm text-gray-400">
                  {stripeStatus.chargesEnabled ? '✅ Pagos habilitados' : '⏳ Pagos pendientes'}
                </div>
                <div className="text-sm text-gray-400">
                  {stripeStatus.payoutsEnabled ? '✅ Retiros habilitados' : '⏳ Retiros pendientes'}
                </div>
                <div className="text-sm text-gray-400">
                  {t.platformFee}: {stripeStatus.platformFeePercent}%
                </div>
              </div>
            ) : (
              <p className="text-gray-400">
                Conecta tu cuenta de Stripe para empezar a recibir pagos directamente.
              </p>
            )}
          </div>
          
          {!stripeStatus?.connected ? (
            <button
              onClick={handleConnectStripe}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <span>🔗</span>
              <span>{t.connectStripe}</span>
            </button>
          ) : (
            <button
              onClick={handleConnectStripe}
              className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-4 rounded-lg font-semibold transition-colors"
            >
              Reconfigurar
            </button>
          )}
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-slate-800 rounded-xl p-6 border border-slate-700"
        >
          <div className="text-green-400 text-sm font-semibold mb-2">{t.totalRevenue.toUpperCase()}</div>
          <div className="text-3xl font-bold text-white">$0</div>
          <div className="text-xs text-gray-500 mt-2">Este mes</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-slate-800 rounded-xl p-6 border border-slate-700"
        >
          <div className="text-yellow-400 text-sm font-semibold mb-2">{t.pendingPayouts.toUpperCase()}</div>
          <div className="text-3xl font-bold text-white">$0</div>
          <div className="text-xs text-gray-500 mt-2">En proceso</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-slate-800 rounded-xl p-6 border border-slate-700"
        >
          <div className="text-cyan-400 text-sm font-semibold mb-2">TICKETS VENDIDOS</div>
          <div className="text-3xl font-bold text-white">0</div>
          <div className="text-xs text-gray-500 mt-2">Total</div>
        </motion.div>
      </div>

      {/* Products / Tickets */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">Productos / Tickets</h3>
          <button
            onClick={() => setShowTicketForm(!showTicketForm)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            + {t.createTicket}
          </button>
        </div>

        {showTicketForm && (
          <form onSubmit={handleCreateTicket} className="bg-slate-900 rounded-lg p-6 mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  {t.ticketLevel}
                </label>
                <select
                  value={ticketForm.level}
                  onChange={(e) => setTicketForm({ ...ticketForm, level: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                >
                  <option value="BASIC">🟦 Discovery (Básico)</option>
                  <option value="ADVANCED">🟪 Breakthrough (Avanzado)</option>
                  <option value="PL">🟨 Quantum Leap (Liderato)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  {t.ticketPrice} (MXN)
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={ticketForm.precio}
                  onChange={(e) => setTicketForm({ ...ticketForm, precio: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                  placeholder="5000.00"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  {t.ticketName} (Español)
                </label>
                <input
                  required
                  type="text"
                  value={ticketForm.nombre}
                  onChange={(e) => setTicketForm({ ...ticketForm, nombre: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                  placeholder="Ticket Básico Generación 40"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  {t.ticketName} (English)
                </label>
                <input
                  type="text"
                  value={ticketForm.nombreEn}
                  onChange={(e) => setTicketForm({ ...ticketForm, nombreEn: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                  placeholder="Basic Ticket Generation 40"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  {t.ticketCapacity}
                </label>
                <input
                  required
                  type="number"
                  value={ticketForm.cupo}
                  onChange={(e) => setTicketForm({ ...ticketForm, cupo: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                  placeholder="100"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  Precio USD (Opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={ticketForm.precioUSD}
                  onChange={(e) => setTicketForm({ ...ticketForm, precioUSD: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                  placeholder="250.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">
                {t.ticketDescription} (Español)
              </label>
              <textarea
                value={ticketForm.descripcion}
                onChange={(e) => setTicketForm({ ...ticketForm, descripcion: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                rows={3}
                placeholder="Descripción del ticket..."
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowTicketForm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Crear Ticket
              </button>
            </div>
          </form>
        )}

        {/* Lista de tickets */}
        <div className="space-y-4">
          {tickets.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              No hay productos/tickets creados aún
            </div>
          ) : (
            tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-slate-900 rounded-lg p-6 border border-slate-700"
              >
                {/* TODO: Mostrar detalles del ticket */}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
