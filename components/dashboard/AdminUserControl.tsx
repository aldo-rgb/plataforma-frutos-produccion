'use client';

import { useState } from 'react';
import { 
  RefreshCcw, UserX, Calendar, Edit, ShieldAlert, 
  Check, X, Loader2, AlertTriangle 
} from 'lucide-react';

interface UserData {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  status: string;
}

interface VisionData {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface EnrollmentData {
  cycleType: 'SOLO' | 'VISION';
  cycleStartDate: string;
  cycleEndDate: string;
  status: string;
}

interface CartaData {
  id: number;
  estado: string;
  approvedAt: string | null;
  cycleStartDate: string | null;
  cycleEndDate: string | null;
  tasksGenerated: boolean;
  finanzasDeclaracion: string;
  relacionesDeclaracion: string;
  talentosDeclaracion: string;
  saludDeclaracion: string;
  pazMentalDeclaracion: string;
  ocioDeclaracion: string;
  servicioTransDeclaracion: string;
  servicioComunDeclaracion: string;
  finanzasMeta: string;
  relacionesMeta: string;
  talentosMeta: string;
  saludMeta: string;
  pazMentalMeta: string;
  ocioMeta: string;
  servicioTransMeta: string;
  servicioComunMeta: string;
}

interface StatsData {
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
}

interface AdminUserControlProps {
  user: UserData;
  vision: VisionData | null;
  enrollment: EnrollmentData | null;
  carta: CartaData | null;
  stats: StatsData;
  onRefresh: () => void;
}

export default function AdminUserControl({
  user,
  vision,
  enrollment,
  carta,
  stats,
  onRefresh
}: AdminUserControlProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // ============================================
  // ACCIÓN 1: REINICIAR CICLO (NUCLEAR)
  // ============================================
  const handleRestartCycle = async () => {
    const confirmText = `⚠️ PELIGRO: REINICIO TOTAL DE CICLO

Esto hará lo siguiente:
• Borrará TODAS las ${stats.total} tareas generadas
• Eliminará el enrollment activo
• Devolverá la carta a estado BORRADOR
• El usuario perderá todo su progreso

Usuario: ${user.nombre}
Email: ${user.email}

Escribe "REINICIAR" para confirmar:`;

    const confirmation = prompt(confirmText);
    
    if (confirmation !== 'REINICIAR') {
      alert('❌ Acción cancelada');
      return;
    }

    const reason = prompt('Motivo del reinicio (obligatorio):');
    if (!reason || reason.trim() === '') {
      alert('❌ Debe especificar un motivo');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/cycle/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, reason })
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ ${data.message}`);
        onRefresh();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al reiniciar ciclo');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ACCIÓN 2: DAR DE BAJA
  // ============================================
  const handleDropUser = async () => {
    const motivo = prompt(`Motivo de la baja para ${user.nombre}:`);
    if (!motivo || motivo.trim() === '') {
      alert('❌ Debe especificar un motivo');
      return;
    }

    if (!confirm(`¿Confirmas dar de baja a ${user.nombre}?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/cycle/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, motivo })
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ ${data.message}`);
        onRefresh();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al dar de baja');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ACCIÓN 3: EXTENDER VISIÓN
  // ============================================
  const handleExtendVision = async () => {
    if (!vision) {
      alert('❌ Usuario no pertenece a una visión');
      return;
    }

    const nuevaFecha = prompt(
      `Fecha actual de fin: ${new Date(vision.endDate).toLocaleDateString()}\n\n` +
      `Ingresa la nueva fecha de fin (YYYY-MM-DD):`
    );

    if (!nuevaFecha) return;

    // Validar formato
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nuevaFecha)) {
      alert('❌ Formato inválido. Usa YYYY-MM-DD');
      return;
    }

    if (!confirm(`¿Extender visión "${vision.name}" hasta ${nuevaFecha}?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/vision/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visionId: vision.id, newEndDate: nuevaFecha })
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ ${data.message}\n\nTareas creadas: ${data.details.totalTasksCreated}`);
        onRefresh();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al extender visión');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // UI
  // ============================================
  const progressPercentage = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  return (
    <div className="bg-[#0f111a] rounded-xl border border-gray-800">
      
      {/* HEADER DEL USUARIO */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {user.nombre}
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                user.rol === 'ADMIN' ? 'bg-red-500/20 text-red-400' :
                user.rol === 'STAFF' ? 'bg-purple-500/20 text-purple-400' :
                user.rol === 'MENTOR' ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {user.rol}
              </span>
            </h2>
            <p className="text-gray-400 text-sm">{user.email}</p>
            
            {vision && (
              <p className="text-purple-400 text-sm mt-1">
                🌟 Pertenece a: <strong>{vision.name}</strong>
              </p>
            )}
            
            {!vision && enrollment?.cycleType === 'SOLO' && (
              <p className="text-blue-400 text-sm mt-1">
                🐺 Usuario Independiente (Ciclo 100 días)
              </p>
            )}
          </div>
          
          {/* BOTÓN MODO EDICIÓN */}
          <button 
            onClick={() => setIsEditMode(!isEditMode)}
            disabled={!carta || carta.estado !== 'APROBADA'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
              isEditMode 
                ? 'bg-yellow-500 text-black hover:bg-yellow-400' 
                : carta?.estado === 'APROBADA'
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-gray-800/30 text-gray-600 cursor-not-allowed'
            }`}
          >
            <Edit size={16} />
            {isEditMode ? 'Modo Edición ACTIVO' : 'Habilitar Edición'}
          </button>
        </div>

        {/* BADGES DE ESTADO */}
        <div className="flex flex-wrap gap-2">
          {enrollment && (
            <>
              <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs border border-green-500/20 font-bold">
                Estado: {enrollment.status}
              </span>
              <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs border border-blue-500/20">
                Tipo: {enrollment.cycleType}
              </span>
              <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-xs border border-purple-500/20">
                Fin: {new Date(enrollment.cycleEndDate).toLocaleDateString()}
              </span>
            </>
          )}
          
          {carta && (
            <span className={`px-3 py-1 rounded-full text-xs border font-bold ${
              carta.estado === 'APROBADA' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
              carta.estado === 'BORRADOR' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
              'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
            }`}>
              Carta: {carta.estado}
            </span>
          )}
        </div>

        {/* BARRA DE PROGRESO */}
        {stats.total > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progreso de Tareas</span>
              <span>{stats.completed} / {stats.total} ({progressPercentage}%)</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-yellow-400">⏳ Pendientes: {stats.pending}</span>
              <span className="text-green-400">✅ Completadas: {stats.completed}</span>
              {stats.cancelled > 0 && (
                <span className="text-red-400">❌ Canceladas: {stats.cancelled}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ZONA DE PELIGRO (ACCIONES DE CICLO) */}
      <div className="p-6 bg-gradient-to-b from-gray-900/50 to-transparent">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="text-red-400" size={20} />
          <h3 className="text-lg font-bold text-white">Zona de Peligro</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* REINICIAR CICLO */}
          <button 
            onClick={handleRestartCycle}
            disabled={loading || !enrollment}
            className="group bg-red-900/10 border border-red-900/30 hover:bg-red-900/30 p-4 rounded-xl text-left transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 text-red-400 font-bold mb-1">
              <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500"/>
              Reiniciar Ciclo
            </div>
            <p className="text-xs text-gray-500">
              Borra {stats.total} tareas y pide llenar Carta de nuevo.
            </p>
          </button>

          {/* DAR DE BAJA */}
          <button 
            onClick={handleDropUser}
            disabled={loading || !enrollment || enrollment.status !== 'ACTIVE'}
            className="group bg-gray-800/30 border border-gray-700 hover:bg-gray-800 p-4 rounded-xl text-left transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 text-gray-300 font-bold mb-1">
              <UserX size={20} />
              Dar de Baja
            </div>
            <p className="text-xs text-gray-500">
              Suspende al usuario del ciclo actual.
            </p>
          </button>

          {/* EXTENDER VISIÓN */}
          {vision && (
            <button 
              onClick={handleExtendVision}
              disabled={loading}
              className="group bg-purple-900/10 border border-purple-900/30 hover:bg-purple-900/30 p-4 rounded-xl text-left transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2 text-purple-400 font-bold mb-1">
                <Calendar size={20} />
                Extender Visión
              </div>
              <p className="text-xs text-gray-500">
                Agrega tareas al final del ciclo grupal.
              </p>
            </button>
          )}

        </div>

        {loading && (
          <div className="mt-4 flex items-center gap-2 text-yellow-400 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Procesando acción...
          </div>
        )}
      </div>

      {/* NOTA SI NO HAY CARTA */}
      {!carta && (
        <div className="p-6 border-t border-gray-800">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
            <AlertTriangle className="text-yellow-400 mx-auto mb-2" size={32} />
            <p className="text-yellow-400 font-bold">
              Este usuario no tiene Carta F.R.U.T.O.S.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Debe crear y aprobar su carta antes de poder gestionar su ciclo.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
