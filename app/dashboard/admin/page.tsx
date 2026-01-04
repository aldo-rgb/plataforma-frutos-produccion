'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Users, PhoneOff, Zap, AlertTriangle, 
  Clock, TrendingUp, ShieldCheck, UserPlus, Gamepad2, CreditCard, Target
} from 'lucide-react';
import Link from 'next/link';

// DATOS MOCK: RENDIMIENTO DE MENTORES
const PERFORMANCE_MENTORES = [
  { 
    id: 1, 
    nombre: 'Sarah Quantum', 
    rol: 'Mentor',
    asignados: 12,
    tglp: 5, 
    tiempoRevision: '1.5h', 
    rating: 4.9,
    status: 'elite' 
  },
  { 
    id: 2, 
    nombre: 'Carlos Iron', 
    rol: 'Mentor',
    asignados: 10,
    tglp: 15, 
    tiempoRevision: '4h',
    rating: 4.5,
    status: 'normal'
  },
  { 
    id: 3, 
    nombre: 'Javier B.', 
    rol: 'Mentor',
    asignados: 8,
    tglp: 45, 
    tiempoRevision: '24h+',
    rating: 3.2,
    status: 'riesgo'
  },
];

// DATOS MOCK: RENDIMIENTO DE GAME CHANGERS (Antes Seniors)
const PERFORMANCE_GAMECHANGERS = [
  {
    id: 10,
    nombre: 'Jorge Perez',
    metaEnrolamiento: 10,
    logrados: 8,
    cartaFrutos: 92, 
  },
  {
    id: 11,
    nombre: 'Lucia M.',
    metaEnrolamiento: 10,
    logrados: 3, 
    cartaFrutos: 70,
  }
];

export default function AdminPerformancePage() {
  const [mentoresInactivos, setMentoresInactivos] = useState(0);
  const [lideresActivos, setLideresActivos] = useState(0);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [visionesActivas, setVisionesActivas] = useState<any[]>([]);
  const [mentoresReales, setMentoresReales] = useState<any[]>([]);
  const [gameChangersReales, setGameChangersReales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarMentoresInactivos();
    cargarPagosPendientes();
    cargarLideresActivos();
    cargarVisionesActivas();
    cargarMentoresReales();
    cargarGameChangersReales();
  }, []);

  useEffect(() => {
    console.log('🔍 Estado de mentoresReales actualizado:', mentoresReales);
    console.log('📏 Longitud:', mentoresReales.length);
  }, [mentoresReales]);

  useEffect(() => {
    console.log('🔍 Estado de gameChangersReales actualizado:', gameChangersReales);
    console.log('📏 Longitud:', gameChangersReales.length);
  }, [gameChangersReales]);

  const cargarLideresActivos = async () => {
    try {
      const res = await fetch('/api/usuarios');
      const data = await res.json();
      if (data.usuarios) {
        const lideres = data.usuarios.filter((u: any) => 
          u.rol === 'LIDER' && u.isActive && u.mentorMarketplaceApproved
        ).length;
        setLideresActivos(lideres);
      }
    } catch (error) {
      console.error('Error al cargar líderes activos:', error);
    }
  };

  const cargarMentoresInactivos = async () => {
    try {
      const res = await fetch('/api/admin/mentores');
      const data = await res.json();
      if (data.success && data.stats) {
        // Contar solicitudes pendientes de MentorApplication
        setMentoresInactivos(data.stats.solicitudesPendientes || 0);
      }
    } catch (error) {
      console.error('Error al cargar mentores inactivos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarPagosPendientes = async () => {
    try {
      const res = await fetch('/api/admin/pending-payments');
      const data = await res.json();
      if (data.success) {
        setPendingPayments(data.pendingPayments || []);
      }
    } catch (error) {
      console.error('Error al cargar pagos pendientes:', error);
    }
  };

  const cargarVisionesActivas = async () => {
    try {
      const res = await fetch('/api/admin/visiones');
      const data = await res.json();
      if (data.visiones) {
        // Filtrar solo las activas para mostrar en el dashboard
        const activas = data.visiones.filter((v: any) => v.isActive);
        setVisionesActivas(activas);
      }
    } catch (error) {
      console.error('Error al cargar visiones activas:', error);
    }
  };

  const cargarMentoresReales = async () => {
    try {
      console.log('🔄 Cargando mentores reales...');
      const res = await fetch('/api/admin/mentores/performance');
      const data = await res.json();
      console.log('📊 Respuesta de mentores:', data);
      if (data.success && data.mentores) {
        console.log(`✅ ${data.mentores.length} mentores cargados:`, data.mentores);
        setMentoresReales(data.mentores);
      } else {
        console.warn('⚠️ No se recibieron mentores válidos:', data);
      }
    } catch (error) {
      console.error('❌ Error al cargar mentores:', error);
    }
  };

  const cargarGameChangersReales = async () => {
    try {
      console.log('🔄 Cargando game changers reales...');
      const res = await fetch('/api/admin/gamechangers/performance');
      const data = await res.json();
      console.log('📊 Respuesta de game changers:', data);
      if (data.success && data.gameChangers) {
        console.log(`✅ ${data.gameChangers.length} game changers cargados:`, data.gameChangers);
        setGameChangersReales(data.gameChangers);
      } else {
        console.warn('⚠️ No se recibieron game changers válidos:', data);
      }
    } catch (error) {
      console.error('❌ Error al cargar game changers:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black italic text-white tracking-tight uppercase flex items-center gap-3">
            Comando <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Central</span>
          </h1>
          <p className="text-slate-400 mt-2">Monitoreo de rendimiento de Mentores y Game Changers.</p>
        </div>
      </div>

      {/* NOTIFICACIÓN DE PAGOS PENDIENTES */}
      {pendingPayments.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 border-2 border-blue-500/50 rounded-2xl p-5 shadow-2xl animate-pulse backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                <div className="relative flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full">
                  <AlertTriangle className="text-white" size={24} />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="animate-pulse">💳</span>
                  Tienes {pendingPayments.length} pago(s) pendiente(s) de autorización
                </h3>
                <p className="text-sm text-blue-200 mt-1">
                  {pendingPayments.length === 1 
                    ? 'Hay un comprobante de pago esperando tu aprobación'
                    : `Hay ${pendingPayments.length} comprobantes de pago esperando tu aprobación`
                  }
                </p>
              </div>
            </div>
            <Link href="/dashboard/admin/ordenes">
              <button className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/50 flex items-center gap-2">
                <ShieldCheck size={20} />
                <span>Revisar Pagos</span>
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Link href="/dashboard/admin/ordenes" className="block">
          <KpiCard 
            icon={<CreditCard className="text-blue-400" />} 
            label="Pagos Pendientes" 
            value={pendingPayments.length.toString()} 
            trend={pendingPayments.length > 0 ? '💳 Requiere Autorización' : '✅ Todo al día'} 
            color="blue"
            isClickable={true}
          />
        </Link>
        <KpiCard 
          icon={<Users className="text-cyan-400" />} 
          label="Líderes Activos" 
          value={loading ? '...' : lideresActivos.toString()} 
          trend={lideresActivos > 0 ? `${lideresActivos} líderes aprobados` : 'Sin líderes activos'} 
          color="cyan"
        />
        <Link href="/dashboard/admin/mentores" className="block">
          <KpiCard 
            icon={<AlertTriangle className="text-orange-400" />} 
            label="Mentores Pendientes" 
            value={loading ? '...' : mentoresInactivos.toString()} 
            trend={mentoresInactivos > 0 ? '⚠️ Requiere Autorización' : '✅ Todo al día'} 
            color="orange"
            isClickable={true}
          />
        </Link>
        <KpiCard 
          icon={<Clock className="text-yellow-400" />} 
          label="Tiempo Prom. Revisión" 
          value="3.5h" 
          trend="⚡ Muy rápido" 
          color="yellow"
        />
        <KpiCard 
          icon={<UserPlus className="text-green-400" />} 
          label="Enrolamiento Staff" 
          value="11/20" 
          trend="55% de Meta Global" 
          color="green"
        />
      </div>

      {/* WIDGET DE VISIONES ACTIVAS */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-white italic uppercase flex items-center gap-2">
            <Target className="text-purple-400" /> Visiones Activas
          </h2>
          <span className="text-xs font-bold text-slate-500 uppercase">
            {visionesActivas.length} {visionesActivas.length === 1 ? 'Visión' : 'Visiones'}
          </span>
        </div>

        {visionesActivas.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Target className="mx-auto mb-2 opacity-30" size={48} />
            <p className="text-sm">No hay visiones activas en este momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visionesActivas.map((vision: any) => {
              const participantesCount = vision._count?.Participantes || 0;
              const mentoresCount = vision._count?.Mentores || 0;
              const gameChangersCount = vision._count?.GameChangers || 0;
              const licensesUsage = vision.maxParticipantes 
                ? Math.round((participantesCount / vision.maxParticipantes) * 100) 
                : 0;

              return (
                <div 
                  key={vision.id} 
                  className="bg-slate-950 border border-white/5 rounded-xl p-5 hover:border-purple-500/30 transition-all hover:shadow-lg hover:shadow-purple-500/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-sm mb-1 line-clamp-1">{vision.nombre}</h3>
                      {vision.descripcion && (
                        <p className="text-xs text-slate-500 line-clamp-2">{vision.descripcion}</p>
                      )}
                    </div>
                    {vision.isActive && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold uppercase border border-green-500/20">
                        <Zap size={10} /> Activa
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Participantes</span>
                      <span className="font-bold text-white">
                        {participantesCount}
                        {vision.maxParticipantes && (
                          <span className="text-slate-500 font-normal"> / {vision.maxParticipantes}</span>
                        )}
                      </span>
                    </div>

                    {vision.maxParticipantes && (
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            licensesUsage >= 90 ? 'bg-red-500' : 
                            licensesUsage >= 70 ? 'bg-yellow-500' : 
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(licensesUsage, 100)}%` }}
                        ></div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500 uppercase">Mentores</p>
                        <p className="text-lg font-bold text-cyan-400">{mentoresCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500 uppercase">Game Changers</p>
                        <p className="text-lg font-bold text-green-400">{gameChangersCount}</p>
                      </div>
                    </div>
                  </div>

                  {vision.Coordinador && (
                    <div className="pt-3 border-t border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase mb-1">Coordinador</p>
                      <p className="text-xs font-medium text-white">{vision.Coordinador.nombre}</p>
                    </div>
                  )}

                  {(vision.startDate || vision.endDate) && (
                    <div className="pt-3 border-t border-white/5 mt-3">
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Clock size={10} />
                        {vision.startDate && (
                          <span>{new Date(vision.startDate).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                        )}
                        {vision.startDate && vision.endDate && <span>→</span>}
                        {vision.endDate && (
                          <span>{new Date(vision.endDate).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: EVALUACIÓN DE MENTORES */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white italic uppercase flex items-center gap-2">
              <ShieldCheck className="text-cyan-400" /> Rendimiento de Mentores
            </h2>
            <button className="text-xs font-bold text-slate-500 hover:text-white uppercase">Ver Reporte Completo</button>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-950 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Mentor</th>
                  <th className="px-6 py-4">Integridad (Faltas)</th>
                  <th className="px-6 py-4">Velocidad</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(mentoresReales.length > 0 ? mentoresReales : PERFORMANCE_MENTORES).map((mentor) => (
                  <tr key={mentor.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{mentor.nombre}</span>
                        <span className="text-[10px] text-slate-500">{mentor.asignados} Mentorados</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${mentor.tglp > 20 ? 'bg-red-500' : 'bg-green-500'}`} 
                            style={{ width: `${mentor.tglp}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-bold ${mentor.tglp > 20 ? 'text-red-400' : 'text-slate-400'}`}>
                          {mentor.tglp}% Perdidas
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-xs text-slate-300">
                        <Clock size={14} className="text-slate-500" />
                        {mentor.tiempoRevision}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {mentor.status === 'elite' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase border border-cyan-500/20">
                          <Zap size={10} /> Elite
                        </span>
                      )}
                      {mentor.status === 'normal' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">
                          Normal
                        </span>
                      )}
                      {mentor.status === 'riesgo' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold uppercase border border-red-500/20 animate-pulse">
                          <AlertTriangle size={10} /> Riesgo
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMNA DERECHA: GAME CHANGERS (1/3 del ancho) */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-white italic uppercase flex items-center gap-2">
            <Gamepad2 className="text-green-400" /> Metas Game Changers
          </h2>

          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-6">
            {(gameChangersReales.length > 0 ? gameChangersReales : PERFORMANCE_GAMECHANGERS).map((gc) => {
              const porcentaje = (gc.logrados / gc.metaEnrolamiento) * 100;
              return (
                <div key={gc.id} className="relative">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{gc.nombre}</h4>
                      <p className="text-[10px] text-slate-400">Carta Personal: <span className="text-cyan-400">{gc.cartaFrutos}%</span></p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-white">{gc.logrados}</span>
                      <span className="text-xs text-slate-500 font-bold"> / {gc.metaEnrolamiento}</span>
                    </div>
                  </div>
                  
                  {/* Barra de Progreso */}
                  <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full ${porcentaje >= 100 ? 'bg-yellow-400' : porcentaje < 50 ? 'bg-red-500' : 'bg-green-500'}`} 
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                  {porcentaje < 40 && (
                    <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                      <TrendingUp size={10} className="rotate-180" /> Bajo Rendimiento
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="bg-gradient-to-br from-red-900/50 to-slate-900 border border-red-500/30 rounded-3xl p-6 text-center">
             <AlertTriangle className="mx-auto text-red-400 mb-2" size={32} />
             <h3 className="font-bold text-white text-sm uppercase">Atención Requerida</h3>
             <p className="text-xs text-slate-400 mt-1 mb-4">Hay 1 Mentor con TGLP crítico (45%).</p>
             <button className="w-full py-2 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-red-500/30">
               INTERVENIR AHORA
             </button>
          </div>

        </div>

      </div>

    </div>
  );
}

function KpiCard({ icon, label, value, trend, color, isClickable }: any) {
  const colors: any = {
    cyan: "border-cyan-500/20 bg-cyan-500/5",
    blue: "border-blue-500/20 bg-blue-500/5",
    red: "border-red-500/20 bg-red-500/5",
    yellow: "border-yellow-500/20 bg-yellow-500/5",
    green: "border-green-500/20 bg-green-500/5",
    orange: "border-orange-500/20 bg-orange-500/5",
  };

  return (
    <div className={`p-6 rounded-2xl border ${colors[color]} backdrop-blur-sm ${isClickable ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-slate-900 rounded-lg">{icon}</div>
        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">KPI</span>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="text-xs font-medium text-slate-400 mt-1">{label}</p>
      <div className="mt-4 pt-4 border-t border-white/5 text-[10px] font-mono text-slate-500">
        {trend}
      </div>
    </div>
  );
}