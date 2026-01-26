'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sparkles, Calendar, Clock, MapPin, Users, CheckCircle, ArrowRight, Star, Zap, Heart, Trophy } from 'lucide-react';
import Image from 'next/image';

interface InvitationData {
  referrer: {
    id: number;
    name: string;
    avatarUrl?: string;
  };
  organization: {
    id: number;
    name: string;
    logoUrl?: string;
  };
  nextBasico?: {
    id: number;
    nombre: string;
    fechaInicio?: string;
    fechaFin?: string;
    lugar?: string;
    precio: number;
    currency: string;
    cuposDisponibles: number;
  };
}

export default function InvitacionPage() {
  const params = useParams();
  const router = useRouter();
  const codigo = params?.codigo as string;
  
  const [data, setData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (codigo) {
      fetchInvitationData();
    }
  }, [codigo]);

  const fetchInvitationData = async () => {
    try {
      const res = await fetch(`/api/invitacion/${codigo}`);
      const result = await res.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Invitación no válida');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar la invitación');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarse = () => {
    if (data?.organization?.id) {
      router.push(`/auth/signup?org=${data.organization.id}&ref=${codigo}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando invitación...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Invitación no válida</h1>
          <p className="text-slate-400 mb-6">{error || 'Esta invitación no existe o ha expirado.'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const benefits = [
    { icon: Zap, text: 'Transforma tu mentalidad y alcanza tu máximo potencial' },
    { icon: Heart, text: 'Conecta con una comunidad de personas extraordinarias' },
    { icon: Trophy, text: 'Herramientas prácticas para resultados inmediatos' },
    { icon: Star, text: 'Experiencia inmersiva de 3 días que cambiará tu vida' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 pt-8 pb-12">
          {/* Organization Logo */}
          {data.organization.logoUrl && (
            <div className="flex justify-center mb-6">
              <Image
                src={data.organization.logoUrl}
                alt={data.organization.name}
                width={120}
                height={120}
                className="rounded-2xl"
              />
            </div>
          )}

          {/* Invitation Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 font-medium text-sm">Invitación Especial</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-white mb-4">
              Entrenamiento Básico
            </h1>
            <p className="text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 font-bold mb-6">
              Transformación Cuántica
            </p>
            
            {/* Inviter Card */}
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-800/60 backdrop-blur-xl border border-purple-500/30 rounded-2xl">
              <div className="relative">
                {data.referrer.avatarUrl ? (
                  <Image
                    src={data.referrer.avatarUrl}
                    alt={data.referrer.name}
                    width={48}
                    height={48}
                    className="rounded-full border-2 border-purple-500"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {data.referrer.name.charAt(0)}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-800 flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="text-left">
                <p className="text-slate-400 text-sm">Te invita</p>
                <p className="text-white font-semibold">{data.referrer.name}</p>
              </div>
            </div>
          </div>

          {/* Next Básico Info Card */}
          {data.nextBasico && (
            <div className="bg-slate-900/70 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6 md:p-8 mb-8">
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Próximo Entrenamiento</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {data.nextBasico.fechaInicio && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Fecha</p>
                        <p className="text-white font-medium capitalize">{formatDate(data.nextBasico.fechaInicio)}</p>
                        {data.nextBasico.fechaFin && (
                          <p className="text-slate-500 text-sm">al {formatDate(data.nextBasico.fechaFin)}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {data.nextBasico.lugar && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-pink-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-pink-400" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Lugar</p>
                        <p className="text-white font-medium">{data.nextBasico.lugar}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Cupos disponibles</p>
                      <p className="text-white font-medium">
                        {data.nextBasico.cuposDisponibles > 0 
                          ? `${data.nextBasico.cuposDisponibles} lugares`
                          : <span className="text-red-400">¡Cupo lleno!</span>
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-green-400 font-bold">$</span>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Inversión</p>
                      <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                        ${data.nextBasico.precio.toLocaleString()} {data.nextBasico.currency}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Benefits Section */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 md:p-8 mb-8">
            <h2 className="text-xl font-bold text-white mb-6 text-center">¿Qué vas a lograr?</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <p className="text-slate-300">{benefit.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <button
              onClick={handleRegistrarse}
              disabled={data.nextBasico?.cuposDisponibles === 0}
              className="group relative px-10 py-5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 rounded-2xl font-bold text-white text-xl shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="flex items-center gap-3">
                ¡Quiero Registrarme!
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity -z-10" />
            </button>
            
            <p className="text-slate-500 text-sm mt-4">
              Al registrarte, aceptas nuestros términos y condiciones
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} {data.organization.name} • Transformación Cuántica
          </p>
        </div>
      </div>
    </div>
  );
}
