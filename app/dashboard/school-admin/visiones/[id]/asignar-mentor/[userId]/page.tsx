'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useToast, ToastContainer } from '@/components/Toast';
import {
  ArrowLeft,
  Users,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  tier: string;
  licenseCode: string | null;
  assignedMentorId: number | null;
}

interface Mentor {
  id: number;
  nombre: string;
  email: string;
  imagen: string | null;
  isActive: boolean;
  PerfilMentor?: {
    especialidad: string | null;
    nivel: string | null;
    tarifa: number | null;
    biografia: string | null;
  };
  CallAvailability: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
}

interface MentorAsignado {
  id: number;
  mentorId: number;
  mentor: Mentor;
  tieneHorarios: boolean;
}

export default function AsignarMentorPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const { showToast, toasts } = useToast();

  const visionId = params?.id as string;
  const userId = params?.userId as string;

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [mentoresAsignados, setMentoresAsignados] = useState<MentorAsignado[]>([]);
  const [visionNombre, setVisionNombre] = useState<string>('');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, visionId, userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Ejecutar las 3 llamadas en paralelo para mejor rendimiento
      const [userRes, mentoresRes, visionRes] = await Promise.all([
        fetch(`/api/school-admin/usuarios/${userId}`),
        fetch(`/api/school-admin/visiones/${visionId}/mentores`),
        fetch(`/api/school-admin/visiones/${visionId}`)
      ]);

      const [userData, mentoresData, visionData] = await Promise.all([
        userRes.json(),
        mentoresRes.json(),
        visionRes.json()
      ]);
      
      if (!userRes.ok) {
        throw new Error(userData.error || 'Error al cargar usuario');
      }
      
      setUsuario(userData.usuario);

      if (mentoresRes.ok) {
        setMentoresAsignados(mentoresData.mentoresAsignados || []);
      }
      
      if (visionRes.ok) {
        setVisionNombre(visionData.vision.nombre);
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      showToast({
        message: error.message || 'Error al cargar datos',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarMentor = async (mentorId: number) => {
    if (!usuario) return;

    // Validar que el usuario tenga licencia
    if (!usuario.licenseCode) {
      showToast({
        message: 'El usuario debe tener una licencia asignada antes de poder asignar un mentor',
        type: 'error',
        duration: 5000
      });
      return;
    }

    // Verificar que el mentor tenga horarios
    const mentorAsignado = mentoresAsignados.find(m => m.mentorId === mentorId);
    if (!mentorAsignado?.tieneHorarios) {
      showToast({
        message: 'Este mentor no tiene horarios de llamadas de disciplina configurados',
        type: 'warning',
        duration: 5000
      });
      return;
    }

    try {
      setProcessing(true);
      
      // Determinar tipo de usuario basado en rol
      const userType = usuario.rol === 'PARTICIPANTE' ? 'PARTICIPANTE' : 'GAMECHANGER';
      
      const res = await fetch(`/api/school-admin/visiones/${visionId}/assign-mentor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: usuario.id,
          mentorId,
          userType
        }),
      });

      const data = await res.json();

      if (data.success) {
        let successMessage = `Mentor asignado exitosamente a ${usuario.nombre}`;
        
        if (data.hadPreviousMentor && data.cancelledCalls > 0) {
          successMessage += `. Se cancelaron ${data.cancelledCalls} llamada(s) y se notificó al usuario.`;
        }
        
        showToast({
          message: successMessage,
          type: 'success',
          duration: data.hadPreviousMentor ? 6000 : 3000
        });
        
        // Redirigir de vuelta a la visión
        setTimeout(() => {
          router.push(`/dashboard/school-admin/visiones/${visionId}`);
        }, 1500);
      } else {
        showToast({
          message: data.error || 'Error al asignar mentor',
          type: 'error',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error assigning mentor:', error);
      showToast({
        message: 'Error al asignar mentor',
        type: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white text-xl mb-2">Usuario no encontrado</p>
          <Link 
            href={`/dashboard/school-admin/visiones/${visionId}`}
            className="text-cyan-400 hover:text-cyan-300 underline"
          >
            Volver a la visión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <ToastContainer toasts={toasts} />
      
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href={`/dashboard/school-admin/visiones/${visionId}`}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="text-white" size={24} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Asignar Mentor</h1>
                <p className="text-sm text-slate-400">
                  {visionNombre || 'Cargando...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Usuario Info */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">
                {usuario.nombre}
              </h2>
              <p className="text-slate-400 text-sm mb-3">{usuario.email}</p>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  usuario.tier === 'PREMIUM'
                    ? 'bg-purple-900/20 text-purple-400 border border-purple-600'
                    : 'bg-cyan-900/20 text-cyan-400 border border-cyan-600'
                }`}>
                  {usuario.tier || 'FREE'}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  usuario.rol === 'PARTICIPANTE'
                    ? 'bg-blue-900/20 text-blue-400 border border-blue-600'
                    : 'bg-orange-900/20 text-orange-400 border border-orange-600'
                }`}>
                  {usuario.rol === 'PARTICIPANTE' ? 'Participante' : 'Game Changer'}
                </span>
              </div>
            </div>
            <div>
              {usuario.licenseCode ? (
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-900/20 text-green-400 border border-green-600 rounded-full text-xs font-medium">
                    <CheckCircle size={14} />
                    Licencia Activa
                  </span>
                  <p className="text-xs text-slate-400 mt-2">
                    Código: <code className="bg-slate-800 px-2 py-1 rounded">{usuario.licenseCode}</code>
                  </p>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-900/20 text-red-400 border border-red-600 rounded-full text-xs font-medium">
                  <XCircle size={14} />
                  Sin Licencia
                </span>
              )}
            </div>
          </div>

          {!usuario.licenseCode && (
            <div className="mt-4 bg-red-900/20 border border-red-600 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-red-400 font-semibold mb-1">
                    Licencia requerida
                  </p>
                  <p className="text-sm text-red-300">
                    Este usuario debe tener una licencia asignada antes de poder asignarle un mentor. 
                    Por favor, asigna una licencia primero desde la vista de la visión.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mentores Asignados a la Visión */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users size={24} className="text-cyan-400" />
              Mentores Disponibles para esta Visión
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Selecciona un mentor de los asignados a las llamadas de disciplina de esta visión
            </p>
          </div>

          {mentoresAsignados.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">
                No hay mentores asignados a esta visión
              </p>
              <p className="text-slate-500 text-sm">
                Debes asignar mentores a la visión primero desde la vista principal
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-3">
              {mentoresAsignados.map((mentorAsignado) => {
                const mentor = mentorAsignado.mentor;
                
                // Skip if mentor data is missing
                if (!mentor) {
                  return null;
                }
                
                const isSelected = usuario.assignedMentorId === mentor.id;
                
                return (
                  <div
                    key={mentor.id}
                    className={`border rounded-xl p-5 transition-all ${
                      isSelected
                        ? 'bg-cyan-900/20 border-cyan-600'
                        : 'bg-slate-800/50 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        {mentor.imagen ? (
                          <img
                            src={mentor.imagen}
                            alt={mentor.nombre}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-xl">
                              {mentor.nombre.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {mentor.nombre}
                          </h3>
                          <p className="text-sm text-slate-400 mb-3">{mentor.email}</p>
                          
                          {mentor.PerfilMentor?.especialidad && (
                            <p className="text-sm text-slate-300 mb-2">
                              <span className="text-slate-500">Especialidad:</span> {mentor.PerfilMentor.especialidad}
                            </p>
                          )}
                          
                          {mentor.PerfilMentor?.biografia && (
                            <p className="text-sm text-slate-400 line-clamp-2">
                              {mentor.PerfilMentor.biografia}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 mt-3">
                            {mentor.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-900/20 text-green-400 border border-green-600 rounded-full text-xs">
                                <CheckCircle size={12} />
                                Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-900/20 text-red-400 border border-red-600 rounded-full text-xs">
                                <XCircle size={12} />
                                Inactivo
                              </span>
                            )}
                            
                            {mentorAsignado.tieneHorarios ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-900/20 text-cyan-400 border border-cyan-600 rounded-full text-xs">
                                <CheckCircle size={12} />
                                {mentor.CallAvailability.length} horarios disponibles
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-900/20 text-yellow-400 border border-yellow-600 rounded-full text-xs">
                                <AlertCircle size={12} />
                                Sin horarios configurados
                              </span>
                            )}
                            
                            {isSelected && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-900/30 text-cyan-300 border border-cyan-500 rounded-full text-xs font-medium">
                                <UserCheck size={12} />
                                Mentor Actual
                              </span>
                            )}
                          </div>
                          
                          {!mentorAsignado.tieneHorarios && (
                            <p className="text-xs text-yellow-400 mt-2">
                              Este mentor no puede ser seleccionado porque no tiene horarios de llamadas de disciplina configurados
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <button
                          onClick={() => handleAsignarMentor(mentor.id)}
                          disabled={
                            processing || 
                            !usuario.licenseCode || 
                            !mentorAsignado.tieneHorarios || 
                            !mentor.isActive ||
                            isSelected
                          }
                          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                            isSelected
                              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                              : !usuario.licenseCode || !mentorAsignado.tieneHorarios || !mentor.isActive
                              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                              : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                          }`}
                        >
                          {processing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : isSelected ? (
                            'Asignado'
                          ) : (
                            'Asignar'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
