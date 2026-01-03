'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Eye, UserCheck, XCircle, CheckCircle, Shield, AlertTriangle, Target } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Lider {
  id: number;
  nombre: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  profileImage: string | null;
  mentorMarketplaceApproved: boolean;
  totalMentorados: number;
  totalVisiones: number;
  organizationId: number | null;
  perfilCompleto?: boolean;
  VisionesAsignadas: Array<{
    id: number;
    nombre: string;
  }>;
}

interface Vision {
  id: number;
  nombre: string;
  totalParticipantes: number;
}

export default function LideresPage() {
  const [lideres, setLideres] = useState<Lider[]>([]);
  const [visiones, setVisiones] = useState<Vision[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [liderSeleccionado, setLiderSeleccionado] = useState<Lider | null>(null);
  const [visionSeleccionada, setVisionSeleccionada] = useState<Vision | null>(null);
  const [notificacionesPendientes, setNotificacionesPendientes] = useState(0);
  const [formLider, setFormLider] = useState({
    nombre: '',
    email: '',
    password: ''
  });
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type, message: '' });
    }, 3000);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      const [resLideres, resVisiones, resNotificaciones] = await Promise.all([
        fetch('/api/school-admin/lideres'),
        fetch('/api/school-admin/visiones'),
        fetch('/api/school-admin/notificaciones/lideres')
      ]);

      const dataLideres = await resLideres.json();
      const dataVisiones = await resVisiones.json();
      const dataNotificaciones = await resNotificaciones.json();

      if (dataLideres.success) {
        setLideres(dataLideres.lideres);
      }

      if (dataVisiones.success) {
        setVisiones(dataVisiones.visiones);
      }

      if (dataNotificaciones.notificaciones) {
        setNotificacionesPendientes(dataNotificaciones.total || 0);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const crearLider = async () => {
    if (!formLider.nombre || !formLider.email || !formLider.password) {
      showNotification('error', 'Todos los campos son requeridos');
      return;
    }

    try {
      const res = await fetch('/api/school-admin/lideres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formLider)
      });

      const data = await res.json();

      if (data.success) {
        showNotification('success', 'Líder creado exitosamente');
        setModalCrear(false);
        setFormLider({ nombre: '', email: '', password: '' });
        cargarDatos();
      } else {
        showNotification('error', data.error || 'Error al crear líder');
      }
    } catch (error) {
      console.error('Error creando líder:', error);
      showNotification('error', 'Error al crear líder');
    }
  };

  const aprobarLider = async (liderId: number) => {
    try {
      const res = await fetch(`/api/school-admin/lideres/${liderId}/aprobar`, {
        method: 'PATCH'
      });

      const data = await res.json();

      if (data.success) {
        showNotification('success', 'Líder aprobado y activado exitosamente');
        cargarDatos();
      } else {
        showNotification('error', data.error || 'Error al aprobar líder');
      }
    } catch (error) {
      console.error('Error aprobando líder:', error);
      showNotification('error', 'Error al aprobar líder');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner message="Cargando líderes..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Notification */}
        {notification.show && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl border-2 ${
            notification.type === 'success'
              ? 'bg-green-900/90 border-green-500 text-green-100'
              : 'bg-red-900/90 border-red-500 text-red-100'
          }`}>
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <XCircle className="w-6 h-6" />
              )}
              <p className="font-bold">{notification.message}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-purple-500 rounded-3xl shadow-2xl shadow-purple-500/50 relative">
              <Shield size={36} className="text-white" />
              {notificacionesPendientes > 0 && (
                <span className="absolute -top-2 -right-2 flex items-center justify-center w-8 h-8 text-xs font-black bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-full shadow-xl shadow-red-500/50 animate-pulse border-2 border-white">
                  {notificacionesPendientes}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
                Gestión de Mentores Internos
              </h1>
              <p className="text-slate-400 text-lg">
                Crea y asigna líderes a tus visiones - Privados de tu organización
                {notificacionesPendientes > 0 && (
                  <span className="ml-3 px-3 py-1 bg-red-500/20 border border-red-500/50 text-red-400 rounded-full text-sm font-bold">
                    {notificacionesPendientes} solicitud{notificacionesPendientes > 1 ? 'es' : ''} de aprobación pendiente{notificacionesPendientes > 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => setModalCrear(true)}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white rounded-2xl font-bold hover:shadow-2xl hover:shadow-purple-500/50 transition-all hover:scale-[1.05] active:scale-[0.98] text-lg"
          >
            <Plus size={24} />
            Nuevo Mentor
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-purple-900/60 via-purple-900/40 to-slate-900 border-2 border-purple-500/40 rounded-3xl p-6 hover:border-purple-400/60 transition-all group hover:scale-[1.02] shadow-xl shadow-purple-900/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/50 group-hover:shadow-purple-500/70 transition-all">
                <Shield className="text-white" size={28} />
              </div>
              <span className="text-4xl font-black bg-gradient-to-br from-purple-400 to-pink-400 bg-clip-text text-transparent">{lideres.length}</span>
            </div>
            <h3 className="text-xl font-black text-white mb-1">Total Mentores</h3>
            <p className="text-sm text-slate-400 font-medium">En tu organización</p>
          </div>

          <div className="bg-gradient-to-br from-green-900/60 via-green-900/40 to-slate-900 border-2 border-green-500/40 rounded-3xl p-6 hover:border-green-400/60 transition-all group hover:scale-[1.02] shadow-xl shadow-green-900/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg shadow-green-500/50 group-hover:shadow-green-500/70 transition-all">
                <CheckCircle className="text-white" size={28} />
              </div>
              <span className="text-4xl font-black bg-gradient-to-br from-green-400 to-emerald-400 bg-clip-text text-transparent">
                {lideres.filter(l => l.mentorMarketplaceApproved).length}
              </span>
            </div>
            <h3 className="text-xl font-black text-white mb-1">Aprobados</h3>
            <p className="text-sm text-slate-400 font-medium">Líderes activos</p>
          </div>

          <div className="bg-gradient-to-br from-orange-900/60 via-orange-900/40 to-slate-900 border-2 border-orange-500/40 rounded-3xl p-6 hover:border-orange-400/60 transition-all group hover:scale-[1.02] shadow-xl shadow-orange-900/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-lg shadow-orange-500/50 group-hover:shadow-orange-500/70 transition-all">
                <AlertTriangle className="text-white" size={28} />
              </div>
              <span className="text-4xl font-black bg-gradient-to-br from-orange-400 to-amber-400 bg-clip-text text-transparent">
                {lideres.filter(l => !l.mentorMarketplaceApproved).length}
              </span>
            </div>
            <h3 className="text-xl font-black text-white mb-1">Pendientes</h3>
            <p className="text-sm text-slate-400 font-medium">Requieren aprobación</p>
          </div>

          <div className="bg-gradient-to-br from-blue-900/60 via-blue-900/40 to-slate-900 border-2 border-blue-500/40 rounded-3xl p-6 hover:border-blue-400/60 transition-all group hover:scale-[1.02] shadow-xl shadow-blue-900/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/50 group-hover:shadow-blue-500/70 transition-all">
                <Users className="text-white" size={28} />
              </div>
              <span className="text-4xl font-black bg-gradient-to-br from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {lideres.reduce((sum, l) => sum + l.totalMentorados, 0)}
              </span>
            </div>
            <h3 className="text-xl font-black text-white mb-1">Mentorados</h3>
            <p className="text-sm text-slate-400 font-medium">Total asignados</p>
          </div>
        </div>

        {/* Lista de Líderes */}
        <div className="bg-gradient-to-br from-slate-800/60 via-slate-900/40 to-slate-800/60 border-2 border-slate-700/50 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/50">
                <Shield className="text-white" size={28} />
              </div>
              <h2 className="text-3xl font-black text-white">Mentores de tu Organización</h2>
            </div>
          </div>
          
          <div className="space-y-4">
            {lideres.map((lider) => (
              <div
                key={lider.id}
                className="bg-gradient-to-r from-slate-800/80 via-slate-900/60 to-slate-800/80 border-2 border-slate-700/70 rounded-2xl p-6 hover:border-purple-500/50 transition-all group hover:scale-[1.01] shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative">
                        {lider.profileImage ? (
                          <img 
                            src={lider.profileImage} 
                            alt={lider.nombre}
                            className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500/50 shadow-lg shadow-purple-500/30"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <Shield size={32} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">{lider.nombre}</h3>
                        <p className="text-sm text-slate-400">{lider.email}</p>
                      </div>
                      <div className="flex gap-2 items-start">
                        {lider.mentorMarketplaceApproved ? (
                          <span className="px-4 py-2 bg-emerald-500/30 text-emerald-300 text-xs font-black rounded-xl border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20">
                            ✓ APROBADO
                          </span>
                        ) : (
                          <>
                            {!lider.perfilCompleto ? (
                              <div className="flex flex-col gap-1.5">
                                <span className="px-4 py-2 bg-red-500/30 text-red-300 text-xs font-black rounded-xl border-2 border-red-500/50 shadow-lg shadow-red-500/20">
                                  ⚠️ PERFIL INCOMPLETO
                                </span>
                                <Link
                                  href={`/dashboard/mentor-profile/${lider.id}`}
                                  className="text-[10px] text-blue-400 hover:text-blue-300 underline text-center transition-colors"
                                >
                                  Ver perfil →
                                </Link>
                              </div>
                            ) : (
                              <button
                                onClick={() => aprobarLider(lider.id)}
                                className="px-4 py-2 bg-yellow-500/30 text-yellow-300 text-xs font-black rounded-xl border-2 border-yellow-500/50 shadow-lg shadow-yellow-500/20 hover:bg-yellow-500/50 transition-all hover:scale-105"
                              >
                                ⏳ APROBAR
                              </button>
                            )}
                          </>
                        )}
                        {lider.isActive ? (
                          <span className="px-4 py-2 bg-green-500/30 text-green-300 text-xs font-black rounded-xl border-2 border-green-500/50 shadow-lg shadow-green-500/20">
                            🟢 ACTIVO
                          </span>
                        ) : (
                          <span className="px-4 py-2 bg-red-500/30 text-red-300 text-xs font-black rounded-xl border-2 border-red-500/50 shadow-lg shadow-red-500/20">
                            🔴 INACTIVO
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-4">
                      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 mb-1.5 font-semibold">Mentorados</p>
                        <p className="text-2xl font-black text-white">{lider.totalMentorados}</p>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 mb-1.5 font-semibold">Visiones</p>
                        <p className="text-2xl font-black text-white">{lider.totalVisiones}</p>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 mb-1.5 font-semibold">Creado</p>
                        <p className="text-sm font-bold text-slate-300">
                          {new Date(lider.createdAt).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {lider.VisionesAsignadas.length > 0 ? (
                        <div className="flex flex-wrap gap-3 flex-1">
                          {lider.VisionesAsignadas.map(vision => (
                            <span
                              key={vision.id}
                              className="px-4 py-2 bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-200 text-sm font-bold rounded-xl border-2 border-purple-500/40 shadow-lg shadow-purple-500/20"
                            >
                              🎯 {vision.nombre}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm italic">Sin visiones asignadas</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {lideres.length === 0 && (
              <div className="text-center py-16 bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-700">
                <div className="p-6 bg-slate-800/50 rounded-3xl w-fit mx-auto mb-6">
                  <Shield size={64} className="text-slate-600 mx-auto" />
                </div>
                <p className="text-slate-300 text-xl font-bold mb-2">No hay mentores creados</p>
                <p className="text-slate-500 text-sm">Crea tu primer líder para comenzar</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Crear Líder */}
        {modalCrear && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-2 border-purple-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-purple-500/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-white">Nuevo Mentor</h3>
                <button
                  onClick={() => setModalCrear(false)}
                  className="p-2 hover:bg-slate-700/50 rounded-xl transition-all"
                >
                  <XCircle className="text-slate-400 hover:text-white" size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Nombre Completo</label>
                  <input
                    type="text"
                    value={formLider.nombre}
                    onChange={(e) => setFormLider({ ...formLider, nombre: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border-2 border-slate-700 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-all"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formLider.email}
                    onChange={(e) => setFormLider({ ...formLider, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border-2 border-slate-700 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-all"
                    placeholder="lider@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Contraseña</label>
                  <input
                    type="password"
                    value={formLider.password}
                    onChange={(e) => setFormLider({ ...formLider, password: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border-2 border-slate-700 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-all"
                    placeholder="********"
                  />
                </div>

                <div className="bg-blue-900/30 border border-blue-500/50 rounded-xl p-4">
                  <p className="text-sm text-blue-300">
                    <strong>Nota:</strong> Este mentor será privado de tu organización y tendrá los mismos permisos que un mentor, excepto que no podrá agendar llamadas de mentoría pagadas.
                  </p>
                </div>

                <button
                  onClick={crearLider}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all hover:scale-[1.02]"
                >
                  Crear Mentor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
