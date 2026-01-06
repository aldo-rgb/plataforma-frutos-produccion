'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Shield, ArrowLeft, CheckCircle, XCircle, Star, Award, Target, Calendar, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface LiderPerfil {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  profileImage: string | null;
  isActive: boolean;
  mentorMarketplaceApproved: boolean;
  profileApprovalStatus: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  profileSubmittedAt: string | null;
  perfilMentor: {
    id: number;
    biografia: string;
    biografiaCorta: string | null;
    especialidad: string;
    especialidadesSecundarias: string[];
    experienciaAnios: number;
    nivel: string;
    tagline: string | null;
    expertiseTags: string[];
  } | null;
}

export default function PerfilLiderPage() {
  const router = useRouter();
  const params = useParams();
  const liderId = Number(params.id);
  
  const [lider, setLider] = useState<LiderPerfil | null>(null);
  const [loading, setLoading] = useState(true);
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
    cargarPerfilLider();
  }, [liderId]);

  const cargarPerfilLider = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/school-admin/lideres/${liderId}`);
      const data = await res.json();

      if (data.success) {
        setLider(data.lider);
      } else {
        showNotification('error', data.error || 'Error al cargar el perfil');
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      showNotification('error', 'Error al cargar el perfil del líder');
    } finally {
      setLoading(false);
    }
  };

  const aprobarPerfil = async () => {
    try {
      const res = await fetch(`/api/school-admin/lideres/${liderId}/aprobar-perfil`, {
        method: 'PATCH'
      });

      const data = await res.json();

      if (data.success) {
        showNotification('success', '✅ Perfil aprobado exitosamente');
        setTimeout(() => {
          router.push('/dashboard/school-admin/lideres');
        }, 1500);
      } else {
        showNotification('error', data.error || 'Error al aprobar perfil');
      }
    } catch (error) {
      console.error('Error aprobando perfil:', error);
      showNotification('error', 'Error al aprobar el perfil');
    }
  };

  const rechazarPerfil = async () => {
    const feedback = prompt('Razón del rechazo (opcional):');
    if (feedback === null) return; // Usuario canceló

    try {
      const res = await fetch(`/api/school-admin/lideres/${liderId}/rechazar-perfil`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback })
      });

      const data = await res.json();

      if (data.success) {
        showNotification('success', '✅ Perfil rechazado');
        setTimeout(() => {
          router.push('/dashboard/school-admin/lideres');
        }, 1500);
      } else {
        showNotification('error', data.error || 'Error al rechazar perfil');
      }
    } catch (error) {
      console.error('Error rechazando perfil:', error);
      showNotification('error', 'Error al rechazar el perfil');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!lider) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/20 border-2 border-red-500 rounded-2xl p-8 text-center">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Líder no encontrado</h2>
            <Link href="/dashboard/school-admin/lideres">
              <button className="mt-4 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition-all">
                Volver a Líderes
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Notificación */}
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

        {/* Header con botón de volver */}
        <div className="mb-6">
          <Link href="/dashboard/school-admin/lideres">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 text-white rounded-xl transition-all border border-slate-700">
              <ArrowLeft size={20} />
              <span>Volver a Líderes</span>
            </button>
          </Link>
        </div>

        {/* Tarjeta principal del perfil */}
        <div className="bg-gradient-to-br from-slate-800/60 via-slate-900/40 to-slate-800/60 border-2 border-purple-500/40 rounded-3xl p-8 shadow-2xl mb-6">
          {/* Header del perfil */}
          <div className="flex items-start gap-6 mb-8">
            {lider.profileImage ? (
              <img 
                src={lider.profileImage} 
                alt={lider.nombre}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-purple-500/50 shadow-lg shadow-purple-500/30"
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Shield size={48} className="text-white" />
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
                {lider.nombre}
              </h1>
              {lider.perfilMentor?.tagline && (
                <p className="text-xl text-purple-300 font-medium mb-4">{lider.perfilMentor.tagline}</p>
              )}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-lg border border-slate-600">
                  <Mail size={16} className="text-purple-400" />
                  <span className="text-slate-300">{lider.email}</span>
                </div>
                {lider.telefono && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-lg border border-slate-600">
                    <Phone size={16} className="text-purple-400" />
                    <span className="text-slate-300">{lider.telefono}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Estado */}
            <div className="text-right">
              {lider.profileApprovalStatus === 'PENDING' && (
                <span className="px-4 py-2 bg-orange-500/30 text-orange-300 text-sm font-bold rounded-xl border-2 border-orange-500/50 inline-block">
                  ⏳ PENDIENTE
                </span>
              )}
              {lider.profileApprovalStatus === 'APPROVED' && (
                <span className="px-4 py-2 bg-green-500/30 text-green-300 text-sm font-bold rounded-xl border-2 border-green-500/50 inline-block">
                  ✅ APROBADO
                </span>
              )}
            </div>
          </div>

          {/* Información del perfil */}
          {lider.perfilMentor && (
            <>
              {/* Especialidad y experiencia */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-purple-900/40 to-slate-900/40 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="text-purple-400" size={20} />
                    <h3 className="text-white font-bold">Especialidad</h3>
                  </div>
                  <p className="text-purple-300 text-lg">{lider.perfilMentor.especialidad}</p>
                </div>

                <div className="bg-gradient-to-br from-blue-900/40 to-slate-900/40 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="text-blue-400" size={20} />
                    <h3 className="text-white font-bold">Experiencia</h3>
                  </div>
                  <p className="text-blue-300 text-lg">{lider.perfilMentor.experienciaAnios} años</p>
                </div>

                <div className="bg-gradient-to-br from-pink-900/40 to-slate-900/40 border border-pink-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="text-pink-400" size={20} />
                    <h3 className="text-white font-bold">Nivel</h3>
                  </div>
                  <p className="text-pink-300 text-lg">{lider.perfilMentor.nivel}</p>
                </div>
              </div>

              {/* Biografía */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Target className="text-purple-400" size={24} />
                  Biografía
                </h3>
                <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-6">
                  <p className="text-slate-300 text-lg leading-relaxed whitespace-pre-wrap">
                    {lider.perfilMentor.biografia || 'Sin biografía'}
                  </p>
                </div>
              </div>

              {/* Tags de expertise */}
              {lider.perfilMentor.expertiseTags && lider.perfilMentor.expertiseTags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-4">Áreas de Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {lider.perfilMentor.expertiseTags.map((tag, index) => (
                      <span 
                        key={index}
                        className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/40 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Especialidades secundarias */}
              {lider.perfilMentor.especialidadesSecundarias && lider.perfilMentor.especialidadesSecundarias.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-4">Especialidades Secundarias</h3>
                  <div className="flex flex-wrap gap-2">
                    {lider.perfilMentor.especialidadesSecundarias.map((esp, index) => (
                      <span 
                        key={index}
                        className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/40 font-medium"
                      >
                        {esp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Botones de acción */}
        {lider.profileApprovalStatus === 'PENDING' && (
          <div className="flex gap-4 justify-center">
            <button
              onClick={aprobarPerfil}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-green-500/50 transition-all hover:scale-105"
            >
              <CheckCircle size={24} />
              <span>Aprobar Perfil</span>
            </button>
            <button
              onClick={rechazarPerfil}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-red-500/50 transition-all hover:scale-105"
            >
              <XCircle size={24} />
              <span>Rechazar Perfil</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
