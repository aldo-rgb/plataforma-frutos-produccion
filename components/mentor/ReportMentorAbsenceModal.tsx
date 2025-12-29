'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ReportMentorAbsenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentorName: string;
  scheduledTime: Date;
  subscriptionId?: number;
  callBookingId?: number;
  onSuccess: () => void;
}

export default function ReportMentorAbsenceModal({
  isOpen,
  onClose,
  mentorName,
  scheduledTime,
  subscriptionId,
  callBookingId,
  onSuccess
}: ReportMentorAbsenceModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/mentor/report-absence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scheduledTime: scheduledTime.toISOString(),
          reason: reason.trim() || null,
          subscriptionId,
          callBookingId
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar el reporte');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al enviar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
              <AlertTriangle className="text-red-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Reportar Ausencia</h2>
              <p className="text-sm text-slate-400">Mentor: {mentorName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Warning Message */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-sm text-slate-300 leading-relaxed">
            Estás a punto de <span className="font-bold text-red-400">marcar una falta</span> a tu Mentor. 
            Esto afectará su reputación en el sistema. ¿Confirmas que no se presentó a la sesión?
          </p>
        </div>

        {/* Scheduled Time */}
        <div className="mb-4">
          <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Hora Programada</p>
          <p className="text-white font-bold">
            {scheduledTime.toLocaleString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        {/* Optional Reason */}
        <div className="mb-6">
          <label className="text-xs text-slate-500 uppercase font-semibold mb-2 block">
            Razón (Opcional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe lo que sucedió..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            rows={3}
            disabled={loading}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              'Confirmar Falta'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
