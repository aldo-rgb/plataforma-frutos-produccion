'use client';

import { useState, useEffect } from 'react';
import { Clock, Trash2, Lock, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { format, differenceInMinutes, addHours } from 'date-fns';
import { es } from 'date-fns/locale';

interface Reserva {
  id: number;
  scheduledAt: string;
  createdAt: string;
  type: string;
  status?: string;
}

interface ResumenReservasProps {
  reservas: Reserva[];
  onEliminar: (id: number) => void;
}

export default function ResumenReservas({ reservas, onEliminar }: ResumenReservasProps) {
  // Estado para forzar re-renderizado del contador cada minuto
  const [tick, setTick] = useState(0);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; reservaId: number; fecha: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000); // Actualizar cada minuto
    return () => clearInterval(timer);
  }, []);

  const handleDeleteClick = (reservaId: number, fechaInicio: Date) => {
    const fechaFormateada = format(fechaInicio, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
    setDeleteModal({ show: true, reservaId, fecha: fechaFormateada });
  };

  const confirmDelete = () => {
    if (deleteModal) {
      onEliminar(deleteModal.reservaId);
      setDeleteModal(null);
    }
  };

  if (reservas.length === 0) return null;

  return (
    <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <CheckCircle className="text-green-400" /> Tus Horarios Seleccionados
      </h3>

      <div className="grid gap-4 md:grid-cols-2">
        {reservas.map((reserva) => {
          // 1. CÁLCULO DE TIEMPO
          const fechaCreacion = new Date(reserva.createdAt);
          const fechaLimite = addHours(fechaCreacion, 1);
          const ahora = new Date();
          
          const minutosRestantes = differenceInMinutes(fechaLimite, ahora);
          const esEditable = minutosRestantes > 0;

          // Parsear fecha de la sesión
          const fechaInicio = new Date(reserva.scheduledAt);
          const fechaFin = new Date(fechaInicio.getTime() + 15 * 60000); // +15 minutos

          return (
            <div 
              key={reserva.id} 
              className={`p-5 rounded-xl border relative overflow-hidden transition-all ${
                esEditable 
                  ? 'bg-[#1a1d2d] border-purple-500/50 shadow-lg shadow-purple-900/10' 
                  : 'bg-gray-900/50 border-gray-800 opacity-90'
              }`}
            >
              {/* Barra de progreso de tiempo (Visual) */}
              {esEditable && (
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-1000"
                  style={{ width: `${(minutosRestantes / 60) * 100}%` }}
                />
              )}

              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-xs uppercase font-bold mb-1">
                    {esEditable ? 'Confirmación Pendiente' : 'Horario Confirmado'}
                  </p>
                  <h4 className="text-white text-lg font-bold">
                    {format(fechaInicio, "EEEE d 'de' MMMM", { locale: es })}
                  </h4>
                  <p className="text-purple-300 font-mono text-xl mt-1">
                    {format(fechaInicio, "HH:mm")} - {format(fechaFin, "HH:mm")}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Llamada Semanal de Disciplina
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {esEditable ? (
                    <>
                      <div className="flex items-center gap-1 text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded-full border border-orange-400/20">
                        <Clock size={12} />
                        <span>{minutosRestantes} min para editar</span>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteClick(reserva.id, fechaInicio)}
                        className="mt-2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/30 p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-bold"
                      >
                        <Trash2 size={16} /> Borrar
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-end text-gray-500">
                      <Lock size={24} className="mb-1" />
                      <span className="text-xs font-bold">Bloqueado</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mensaje Informativo si es editable */}
              {esEditable && (
                <div className="mt-4 flex items-start gap-2 text-xs text-gray-400 bg-black/20 p-2 rounded">
                  <AlertTriangle size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                  <p>Puedes modificar este horario libremente durante la próxima hora. Después, tendrás que contactar a soporte.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {deleteModal?.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-red-500/30 animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 rounded-t-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-red-500/20 backdrop-blur-sm"></div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <Trash2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Eliminar Reserva</h3>
                  <p className="text-red-100 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-slate-300 text-lg mb-4">
                  ¿Estás seguro que deseas eliminar la reserva para:
                </p>
                <div className="bg-slate-950/50 border border-slate-700 rounded-xl p-4">
                  <p className="text-white font-bold text-center capitalize">
                    {deleteModal.fecha}
                  </p>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-yellow-200 font-semibold mb-1">Importante:</p>
                    <p className="text-yellow-100/80">
                      Tendrás que seleccionar un nuevo horario después de eliminar esta reserva.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
