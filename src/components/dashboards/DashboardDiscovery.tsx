'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMultiLevelTranslations } from '@/lib/i18n/multi-level';
import { QrReader } from 'react-qr-reader';

interface DashboardDiscoveryProps {
  visionId: number;
  locale?: 'es' | 'en';
}

export default function DashboardDiscovery({ visionId, locale = 'es' }: DashboardDiscoveryProps) {
  const t = useMultiLevelTranslations(locale).dashboards.basic;
  const tf = useMultiLevelTranslations(locale).finances;
  
  const [activeTab, setActiveTab] = useState<'attendance' | 'payments' | 'registrations'>('attendance');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showCodeGenerator, setShowCodeGenerator] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRegistrations: 0,
    totalRevenue: 0,
    attendanceToday: 0,
    backlog: 0,
    drops: 0,
  });

  // Formulario para generar código
  const [codeForm, setCodeForm] = useState({
    ticketId: '',
    amount: '',
    metadata: {
      nombre: '',
      telefono: '',
      notas: '',
    },
  });

  useEffect(() => {
    loadStats();
    loadGeneratedCodes();
  }, [visionId]);

  const loadStats = async () => {
    // TODO: Cargar estadísticas desde la API
  };

  const loadGeneratedCodes = async () => {
    try {
      const response = await fetch(`/api/access-codes/generate?visionId=${visionId}`);
      if (response.ok) {
        const data = await response.json();
        setGeneratedCodes(data.codes || []);
      }
    } catch (error) {
      console.error('Error cargando códigos:', error);
    }
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/access-codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: parseInt(codeForm.ticketId),
          visionId,
          amount: parseFloat(codeForm.amount),
          currency: 'MXN',
          metadata: codeForm.metadata,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`${tf.codeGenerated}\n\nCódigo: ${data.code}`);
        setShowCodeGenerator(false);
        loadGeneratedCodes();
        // Reset form
        setCodeForm({
          ticketId: '',
          amount: '',
          metadata: { nombre: '', telefono: '', notas: '' },
        });
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generando código:', error);
      alert('Error al generar código');
    }
  };

  const handleQRScan = async (result: any, error: any) => {
    if (result) {
      // TODO: Procesar check-in
      console.log('QR escaneado:', result.text);
      setShowQRScanner(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          🟦 {t.title}
        </h1>
        <p className="text-gray-400">
          Control de Asistencia, Pagos y Registros
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-slate-800 rounded-xl p-6 border border-slate-700"
        >
          <div className="text-cyan-400 text-sm font-semibold mb-2">REGISTROS</div>
          <div className="text-3xl font-bold text-white">{stats.totalRegistrations}</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-slate-800 rounded-xl p-6 border border-slate-700"
        >
          <div className="text-green-400 text-sm font-semibold mb-2">INGRESOS</div>
          <div className="text-3xl font-bold text-white">${stats.totalRevenue.toLocaleString()}</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-slate-800 rounded-xl p-6 border border-slate-700"
        >
          <div className="text-blue-400 text-sm font-semibold mb-2">ASISTENCIA HOY</div>
          <div className="text-3xl font-bold text-white">{stats.attendanceToday}</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-slate-800 rounded-xl p-6 border border-slate-700"
        >
          <div className="text-yellow-400 text-sm font-semibold mb-2">{t.backlog.toUpperCase()}</div>
          <div className="text-3xl font-bold text-white">{stats.backlog}</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-slate-800 rounded-xl p-6 border border-slate-700"
        >
          <div className="text-red-400 text-sm font-semibold mb-2">{t.drops.toUpperCase()}</div>
          <div className="text-3xl font-bold text-white">{stats.drops}</div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'attendance'
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
          }`}
        >
          📋 {t.attendance}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'payments'
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
          }`}
        >
          💰 {t.payments}
        </button>
        <button
          onClick={() => setActiveTab('registrations')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'registrations'
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
          }`}
        >
          📝 {t.registrations}
        </button>
      </div>

      {/* Content */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <button
                onClick={() => setShowQRScanner(!showQRScanner)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                📷 {t.scanQR}
              </button>
              <button
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                📸 {t.takePhoto}
              </button>
            </div>

            {showQRScanner && (
              <div className="bg-slate-900 rounded-lg p-4">
                <QrReader
                  constraints={{ facingMode: 'environment' }}
                  onResult={handleQRScan}
                  className="w-full"
                />
              </div>
            )}

            <div className="bg-slate-900 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Lista de Asistencia - Hoy
              </h3>
              <div className="text-gray-400 text-center py-8">
                No hay registros de asistencia para hoy
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-6">
            <button
              onClick={() => setShowCodeGenerator(!showCodeGenerator)}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              🎫 {t.generateAccessCode}
            </button>

            {showCodeGenerator && (
              <form onSubmit={handleGenerateCode} className="bg-slate-900 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Generar Código de Acceso
                </h3>

                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2">
                    Ticket / Producto
                  </label>
                  <select
                    required
                    value={codeForm.ticketId}
                    onChange={(e) => setCodeForm({ ...codeForm, ticketId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                  >
                    <option value="">Seleccionar...</option>
                    {/* TODO: Cargar tickets disponibles */}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2">
                    Monto Recibido (MXN)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={codeForm.amount}
                    onChange={(e) => setCodeForm({ ...codeForm, amount: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                    placeholder="5000.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2">
                    Nombre del Pagador
                  </label>
                  <input
                    type="text"
                    value={codeForm.metadata.nombre}
                    onChange={(e) =>
                      setCodeForm({
                        ...codeForm,
                        metadata: { ...codeForm.metadata, nombre: e.target.value },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={codeForm.metadata.telefono}
                    onChange={(e) =>
                      setCodeForm({
                        ...codeForm,
                        metadata: { ...codeForm.metadata, telefono: e.target.value },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                    placeholder="5551234567"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowCodeGenerator(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Generar Código
                  </button>
                </div>
              </form>
            )}

            {/* Lista de códigos generados */}
            <div className="bg-slate-900 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Códigos Generados Recientemente
              </h3>
              {generatedCodes.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  No hay códigos generados
                </div>
              ) : (
                <div className="space-y-2">
                  {generatedCodes.slice(0, 10).map((code) => (
                    <div
                      key={code.id}
                      className="flex items-center justify-between bg-slate-800 p-4 rounded-lg"
                    >
                      <div>
                        <div className="font-mono text-xl text-cyan-400">{code.code}</div>
                        <div className="text-sm text-gray-400">
                          ${code.amount.toLocaleString()} {code.currency} •{' '}
                          {code.status === 'USED' ? '✅ Usado' : '⏳ Disponible'}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {new Date(code.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'registrations' && (
          <div className="space-y-6">
            <div className="text-gray-400 text-center py-8">
              Lista de registros del nivel básico
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
