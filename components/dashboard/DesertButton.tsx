'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

export default function DesertButton() {
  const [loading, setLoading] = useState(true);
  const [canDesert, setCanDesert] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deserting, setDeserting] = useState(false);

  useEffect(() => {
    checkDesertStatus();
  }, []);

  const checkDesertStatus = async () => {
    try {
      const res = await fetch('/api/user/desert');
      const data = await res.json();
      
      setCanDesert(data.canDesert);
      if (data.canDesert) {
        setEnrollmentData(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDesert = async () => {
    if (confirmText !== 'DESERTAR') {
      alert('❌ Debes escribir "DESERTAR" exactamente para confirmar');
      return;
    }

    setDeserting(true);
    try {
      const res = await fetch('/api/user/desert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmacion: confirmText })
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ ${data.message}`);
        setShowModal(false);
        setCanDesert(false);
        // Recargar página después de 2 segundos
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al procesar deserción');
    } finally {
      setDeserting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Loader2 size={16} className="animate-spin" />
        Cargando...
      </div>
    );
  }

  if (!canDesert) {
    return null; // No mostrar el botón si no hay ciclo activo
  }

  return (
    <>
      {/* BOTÓN DE ZONA DE PELIGRO */}
      <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="text-red-400" size={24} />
          <h3 className="text-lg font-bold text-red-400">Zona de Peligro</h3>
        </div>
        
        <p className="text-sm text-gray-400 mb-4">
          Si decides abandonar tu ciclo actual, perderás acceso a todas tus tareas pendientes
          y tu progreso quedará congelado. Esta acción NO se puede deshacer.
        </p>

        <div className="bg-red-950/30 rounded-lg p-4 mb-4 text-xs space-y-1">
          <div className="text-red-300">
            <strong>Tipo de ciclo:</strong> {enrollmentData.enrollment.cycleType === 'SOLO' ? '🐺 Independiente' : '🌟 Visión Grupal'}
          </div>
          {enrollmentData.enrollment.visionName && (
            <div className="text-red-300">
              <strong>Visión:</strong> {enrollmentData.enrollment.visionName}
            </div>
          )}
          <div className="text-red-300">
            <strong>Fin del ciclo:</strong> {new Date(enrollmentData.enrollment.cycleEndDate).toLocaleDateString()}
          </div>
          <div className="text-red-400 font-bold mt-2">
            ⚠️ {enrollmentData.warning}
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all"
        >
          Desertar del Ciclo Actual
        </button>
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1b1f] border border-red-900/50 rounded-xl max-w-md w-full p-6">
            
            {/* HEADER */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-400" size={28} />
                <h2 className="text-xl font-bold text-white">
                  ¿Estás Seguro?
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* CONTENIDO */}
            <div className="space-y-4 mb-6">
              <p className="text-gray-300 text-sm">
                Estás a punto de <strong className="text-red-400">desertar de tu ciclo actual</strong>. 
                Esto significa que:
              </p>

              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-red-400">❌</span>
                  <span>Perderás acceso a <strong>{enrollmentData.stats.pending} tareas pendientes</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">❌</span>
                  <span>Tu progreso quedará congelado ({enrollmentData.stats.completed} tareas completadas)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">❌</span>
                  <span>No podrás reactivar este ciclo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">❌</span>
                  <span>Tu mentor será notificado</span>
                </li>
              </ul>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-300 text-xs">
                  💡 <strong>Nota:</strong> Si estás teniendo dificultades, considera hablar 
                  primero con tu mentor. Ellos pueden ayudarte a ajustar tu plan.
                </p>
              </div>
            </div>

            {/* CONFIRMACIÓN */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-white mb-2">
                Para confirmar, escribe: <span className="text-red-400">DESERTAR</span>
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Escribe DESERTAR aquí"
                className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
              />
            </div>

            {/* BOTONES */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={deserting}
                className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-700 disabled:opacity-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDesert}
                disabled={deserting || confirmText !== 'DESERTAR'}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {deserting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Confirmar Deserción'
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
