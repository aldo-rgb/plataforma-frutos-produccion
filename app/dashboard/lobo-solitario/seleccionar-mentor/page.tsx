'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Users, Star, Zap, Loader2, ArrowLeft, Check, Package } from 'lucide-react';
import Image from 'next/image';
import ModalPerfilMentor from '@/components/mentorias/ModalPerfilMentor';

interface Mentor {
  id: number;
  perfilMentorId: number;
  nombre: string;
  imagen: string | null;
  titulo: string;
  especialidad: string;
  biografia: string;
  rating: number;
  totalSesiones: number;
  precioPorSesion?: number;
  strikes?: number;
  confiabilidad?: number;
}

export default function SeleccionarMentorLoboPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  // Obtener plan y frecuencia de los query params
  const plan = searchParams.get('plan') as 'STANDARD' | 'PREMIUM' | null;
  const frecuencia = searchParams.get('frecuencia') as 'BIMESTRAL' | 'ANUAL' | null;
  
  const [mentores, setMentores] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMentor, setSelectedMentor] = useState<number | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [mentorPerfilId, setMentorPerfilId] = useState<number | null>(null);
  const [activePackage, setActivePackage] = useState<any>(null);

  // Calcular sesiones según el plan y frecuencia
  const cantidadSesiones = frecuencia === 'ANUAL' ? 108 : 18;
  const nombrePlan = plan === 'PREMIUM' ? 'Premium' : 'Standard';

  useEffect(() => {
    if (!plan || !frecuencia) {
      router.push('/dashboard/suscripcion');
      return;
    }
    verificarPaqueteActivo();
    cargarMentores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, frecuencia]);

  const verificarPaqueteActivo = async () => {
    try {
      const res = await fetch('/api/lobo-solitario/verificar-paquete-activo');
      if (res.ok) {
        const data = await res.json();
        if (data.hasActivePackage) {
          setActivePackage(data.package);
        }
      }
    } catch (error) {
      console.error('Error verificando paquete activo:', error);
    }
  };

  const cargarMentores = async () => {
    try {
      const res = await fetch('/api/mentores/disponibles');
      if (res.ok) {
        const data = await res.json();
        setMentores(data.mentores || []);
      }
    } catch (error) {
      console.error('Error cargando mentores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarMentor = async () => {
    if (!selectedMentor || !plan || !frecuencia) return;

    setProcesando(true);
    try {
      // Crear orden de paquete para lobo solitario
      const res = await fetch('/api/lobo-solitario/crear-paquete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId: selectedMentor,
          plan: plan,
          frecuencia: frecuencia,
          cantidadSesiones: cantidadSesiones,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ordenId) {
        // Redirigir a procesar pago
        router.push(`/dashboard/lobo-solitario/procesar-pago?ordenId=${data.ordenId}`);
      } else {
        // Mostrar mensaje de error específico
        const errorMsg = data.details?.message || data.error || 'Error al crear el paquete';
        
        if (data.details) {
          // Si tiene detalles, mostrar información completa
          const details = data.details;
          alert(
            `${errorMsg}\n\n` +
            `Sesiones restantes: ${details.remainingSessions}/${details.totalSessions}\n` +
            `Plan: ${details.planType} ${details.frecuencia}\n` +
            `Mentor: ${details.mentor}\n` +
            (details.expiresAt ? `Expira: ${new Date(details.expiresAt).toLocaleDateString('es-MX')}` : '')
          );
        } else {
          alert(errorMsg);
        }
        setProcesando(false);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar la solicitud');
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-slate-400">Cargando mentores disponibles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          Volver
        </button>
        
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Selecciona tu Mentor Personal
        </h1>
        <p className="text-slate-400">
          Elige al mentor que te acompañará en tu transformación
        </p>
      </div>

      {/* Alerta de paquete activo */}
      {activePackage && (
        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <div className="bg-yellow-500/20 p-2 rounded-lg">
              <Package className="text-yellow-400" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-yellow-400 mb-2">
                Ya tienes un paquete activo
              </h3>
              <p className="text-slate-300 text-sm mb-3">
                {activePackage.isAnual 
                  ? 'Tienes un plan ANUAL activo. No puedes comprar otro paquete hasta que uses tus sesiones actuales o expire tu plan.'
                  : 'Tienes un paquete activo. Usa tus sesiones restantes antes de comprar otro paquete.'}
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Sesiones restantes</p>
                  <p className="text-white font-semibold">{activePackage.remainingSessions} de {activePackage.totalSessions}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Plan</p>
                  <p className="text-white font-semibold">{activePackage.planType} {activePackage.frecuencia}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Mentor</p>
                  <p className="text-white font-semibold">{activePackage.mentor?.nombre}</p>
                </div>
                {activePackage.expiresAt && (
                  <div>
                    <p className="text-slate-500 text-xs">Expira</p>
                    <p className="text-white font-semibold">
                      {new Date(activePackage.expiresAt).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-4 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors text-sm font-medium"
              >
                Ir al Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info del paquete */}
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-6 mb-8">
          <ArrowLeft size={20} />
          Volver
        </button>
        
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Selecciona tu Mentor Personal
        </h1>
        <p className="text-slate-400">
          Elige al mentor que te acompañará en tu transformación
        </p>
      </div>

      {/* Info del paquete */}
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Package className="text-purple-400" size={24} />
          <h3 className="text-xl font-bold text-white">
            Paquete {nombrePlan} - {frecuencia === 'ANUAL' ? 'Anual' : 'Bimestral'}
          </h3>
        </div>
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Check className="text-green-400" size={16} />
            <span className="text-slate-300">
              <strong>{cantidadSesiones} sesiones</strong> incluidas
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="text-green-400" size={16} />
            <span className="text-slate-300">
              Mentor personal asignado
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="text-green-400" size={16} />
            <span className="text-slate-300">
              {frecuencia === 'ANUAL' ? '2 sesiones semanales' : '2 sesiones semanales'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de mentores */}
      {mentores.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No hay mentores disponibles en este momento</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {mentores.map((mentor) => {
            const strikes = mentor.strikes || 0;
            const confiabilidad = mentor.confiabilidad !== undefined ? mentor.confiabilidad : 100;
            const precioPorSesion = mentor.precioPorSesion || (plan === 'PREMIUM' ? 500 : 90);
            
            return (
              <div
                key={mentor.id}
                className={`relative bg-slate-900 rounded-xl border transition-all ${
                  selectedMentor === mentor.id
                    ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Header con avatar y nombre */}
                <div className="p-6 pb-4">
                  {/* Avatar grande centrado */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative w-32 h-32 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center text-white text-5xl font-bold shadow-xl shadow-purple-500/20 mb-4">
                      {mentor.imagen ? (
                        <Image
                          src={mentor.imagen}
                          alt={mentor.nombre}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span>{mentor.nombre.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {mentor.nombre}
                      </h3>
                      <p className="text-slate-400 text-sm mb-2">
                        {mentor.especialidad || 'Mentor Frutos del Espíritu'}
                      </p>
                      <div className="flex items-center justify-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < Math.floor(mentor.rating) ? 'text-yellow-500 fill-current' : 'text-slate-600'}
                          />
                        ))}
                        <span className="text-xs text-slate-400 ml-1">Sin calificaciones</span>
                      </div>
                    </div>
                  </div>

                  {/* Métricas de confiabilidad y sesiones */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-950 rounded-lg p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <Check size={12} className="text-green-400" />
                        <span className="text-xs text-slate-400">Confiabilidad</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${confiabilidad}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-white">{confiabilidad}%</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{strikes}/5 strikes</p>
                    </div>

                    <div className="bg-slate-950 rounded-lg p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <Users size={12} className="text-cyan-400" />
                        <span className="text-xs text-slate-400">Sesiones</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-white">{mentor.totalSesiones}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">llamadas</p>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedMentor(mentor.id)}
                      className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                        selectedMentor === mentor.id
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      {selectedMentor === mentor.id ? (
                        <>
                          <Check size={18} />
                          Seleccionado
                        </>
                      ) : (
                        'Seleccionar Mentor'
                      )}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMentorPerfilId(mentor.id);
                        setShowPerfilModal(true);
                      }}
                      className="w-full py-2 border border-purple-500/30 hover:border-purple-500 text-purple-400 hover:text-purple-300 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <Users size={14} />
                      Ver Perfil Completo
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Botón continuar */}
      {selectedMentor && !activePackage && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-700 p-4 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex justify-end">
            <button
              onClick={handleSeleccionarMentor}
              disabled={procesando || !!activePackage}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {procesando ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Procesando...
                </>
              ) : (
                <>
                  Continuar al Pago
                  <Zap size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Perfil de Mentor */}
      {mentorPerfilId && (
        <ModalPerfilMentor
          mentorId={mentorPerfilId}
          isOpen={showPerfilModal}
          onClose={() => {
            setShowPerfilModal(false);
            setMentorPerfilId(null);
          }}
        />
      )}
    </div>
  );
}
