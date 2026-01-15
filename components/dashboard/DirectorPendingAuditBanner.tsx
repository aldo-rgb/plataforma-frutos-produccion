'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardCheck, X, ChevronRight, Star, Calendar, Building2 } from 'lucide-react';
import { DirectorAuditModal } from '@/components/training-closure';

interface PendingAudit {
  productId: number;
  productName: string;
  levelType: string;
  visionName: string;
  endDate: string | null;
}

export default function DirectorPendingAuditBanner() {
  const [pendingAudits, setPendingAudits] = useState<PendingAudit[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    fetchPendingAudits();
  }, []);

  const fetchPendingAudits = async () => {
    try {
      const res = await fetch('/api/director/pending-audits');
      const data = await res.json();
      
      if (data.pendingAudits && data.pendingAudits.length > 0) {
        setPendingAudits(data.pendingAudits);
      }
    } catch (error) {
      console.error('Error fetching pending audits:', error);
    }
  };

  const handleOpenAudit = (audit: PendingAudit) => {
    setSelectedProduct({ id: audit.productId, name: audit.productName });
    setShowAuditModal(true);
  };

  const handleAuditComplete = () => {
    setShowAuditModal(false);
    setSelectedProduct(null);
    // Remover la auditoría completada de la lista
    if (selectedProduct) {
      setPendingAudits(prev => prev.filter(a => a.productId !== selectedProduct.id));
    }
  };

  // No mostrar si no hay auditorías pendientes o fue descartado
  if (pendingAudits.length === 0 || dismissed) {
    return null;
  }

  const currentAudit = pendingAudits[0];

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'BASIC': return 'Básico';
      case 'ADVANCED': return 'Avanzado';
      case 'PL': return 'Liderato';
      default: return level;
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-4"
        >
          <div className="relative overflow-hidden rounded-2xl border-2 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border-indigo-500/50">
            {/* Efecto de brillo animado */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/10 to-transparent animate-shimmer" />
            
            <div className="relative p-4">
              <div className="flex items-center justify-between gap-4">
                {/* Icono y contenido */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center animate-pulse">
                      <ClipboardCheck className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-bold text-lg truncate">
                        📋 Auditoría Pendiente
                      </h3>
                      {pendingAudits.length > 1 && (
                        <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-300 text-xs font-semibold rounded-full">
                          +{pendingAudits.length - 1} más
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-slate-300 truncate">
                        <Building2 className="w-4 h-4 inline mr-1" />
                        {currentAudit.productName}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 text-xs font-semibold rounded-full">
                        {getLevelLabel(currentAudit.levelType)}
                      </span>
                      {currentAudit.endDate && (
                        <span className="text-slate-400 text-xs hidden sm:inline">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Finalizó: {new Date(currentAudit.endDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    <p className="text-indigo-300 text-xs mt-1">
                      🏆 Evalúa el desempeño del entrenamiento completado
                    </p>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAudit(currentAudit)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                  >
                    <Star className="w-4 h-4" />
                    <span className="hidden sm:inline">Evaluar Ahora</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => setDismissed(true)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                    title="Cerrar (se mostrará de nuevo al recargar)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Modal de Auditoría */}
      {showAuditModal && selectedProduct && (
        <DirectorAuditModal
          onClose={() => {
            setShowAuditModal(false);
            setSelectedProduct(null);
          }}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          onComplete={handleAuditComplete}
        />
      )}
    </>
  );
}
