'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { 
  FileText, 
  User, 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp,
  DollarSign,
  Heart,
  Dumbbell,
  Clock,
  Briefcase,
  Sparkles,
  TrendingUp,
  Users,
  CheckCircle2,
  Calendar,
  Target
} from 'lucide-react';
import Link from 'next/link';

interface Meta {
  id: number;
  categoria: string;
  metaPrincipal: string;
  declaracionPoder: string | null;
  status: string;
  mentorFeedback: string | null;
  Accion: Accion[];
}

interface Accion {
  id: number;
  texto: string;
  frequency: string;
  assignedDays: number[];
  specificDate: string | null;
  requiereEvidencia: boolean;
  completada: boolean;
  enRevision: boolean;
}

interface CartaData {
  id: number;
  estado: string;
  autorizadoMentor: boolean;
  fechaCreacion: string | null;
  finanzasMeta: string | null;
  finanzasDeclaracion: string | null;
  relacionesMeta: string | null;
  relacionesDeclaracion: string | null;
  saludMeta: string | null;
  saludDeclaracion: string | null;
  ocioMeta: string | null;
  ocioDeclaracion: string | null;
  talentosMeta: string | null;
  talentosDeclaracion: string | null;
  pazMentalMeta: string | null;
  pazMentalDeclaracion: string | null;
  servicioTransMeta: string | null;
  servicioTransDeclaracion: string | null;
  servicioComunMeta: string | null;
  servicioComunDeclaracion: string | null;
  Meta: Meta[];
}

interface ParticipanteInfo {
  id: number;
  nombre: string;
  email: string;
  mentor: {
    nombre: string;
    email: string;
  } | null;
}

const AREAS_CONFIG = [
  { key: 'finanzas', label: 'Finanzas', icon: DollarSign, color: 'green' },
  { key: 'relaciones', label: 'Relaciones', icon: Heart, color: 'pink' },
  { key: 'salud', label: 'Salud', icon: Dumbbell, color: 'red' },
  { key: 'ocio', label: 'Ocio', icon: Clock, color: 'blue' },
  { key: 'talentos', label: 'Talentos/Ocupación', icon: Briefcase, color: 'purple' },
  { key: 'pazMental', label: 'Paz Mental', icon: Sparkles, color: 'yellow' },
  { key: 'servicioTrans', label: 'Servicio Transformacional', icon: TrendingUp, color: 'orange', conditional: 'forceTransformationArea' },
  { key: 'servicioComun', label: 'Servicio Comunitario', icon: Users, color: 'cyan', conditional: 'forceCommunityServiceArea' }
];

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const FRECUENCIA_LABELS: Record<string, string> = {
  'ONE_TIME': 'Una vez',
  'DAILY': 'Diaria',
  'WEEKLY': 'Semanal',
  'MONTHLY': 'Mensual'
};

export default function GameChangerVerCartaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const participanteId = params?.id as string;

  const [carta, setCarta] = useState<CartaData | null>(null);
  const [participante, setParticipante] = useState<ParticipanteInfo | null>(null);
  const [visionConfig, setVisionConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'GAMECHANGER') {
      router.push('/dashboard');
    } else if (participanteId) {
      fetchCarta();
    }
  }, [status, session, participanteId]);

  const fetchCarta = async () => {
    try {
      const res = await fetch(`/api/gamechanger/participante/${participanteId}/carta`);
      const data = await res.json();

      if (res.ok && data.success) {
        setCarta(data.carta);
        setParticipante(data.participante);
        setVisionConfig(data.visionConfig);
        
        // Expandir todas las áreas por defecto
        const initialExpanded: Record<string, boolean> = {};
        AREAS_CONFIG.forEach(area => {
          initialExpanded[area.key] = true;
        });
        setExpandedAreas(initialExpanded);
      } else {
        alert(data.error || 'Error al cargar la carta');
        router.push('/dashboard/gamechanger/participantes');
      }
    } catch (error) {
      console.error('Error fetching carta:', error);
      alert('Error al cargar la carta');
      router.push('/dashboard/gamechanger/participantes');
    } finally {
      setLoading(false);
    }
  };

  const toggleArea = (areaKey: string) => {
    setExpandedAreas(prev => ({
      ...prev,
      [areaKey]: !prev[areaKey]
    }));
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
      green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: 'text-green-500' },
      pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', icon: 'text-pink-500' },
      red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: 'text-red-500' },
      blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: 'text-blue-500' },
      purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', icon: 'text-purple-500' },
      yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: 'text-yellow-500' },
      orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', icon: 'text-orange-500' },
      cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', icon: 'text-cyan-500' }
    };
    return colors[color] || colors.green;
  };

  const getMetasForArea = (areaKey: string) => {
    if (!carta) return [];
    return carta.Meta.filter(meta => meta.categoria.toLowerCase() === areaKey.toLowerCase());
  };

  const shouldShowArea = (area: typeof AREAS_CONFIG[0]) => {
    // Si no hay visionConfig, mostrar todas las áreas
    if (!visionConfig) return true;
    
    // Para áreas condicionales (transformación y comunitaria)
    if (area.conditional) {
      return visionConfig[area.conditional] === true;
    }
    
    // Para áreas básicas, verificar el campo force correspondiente
    const forceField = `force${area.key.charAt(0).toUpperCase() + area.key.slice(1)}Area`;
    
    // Si el campo existe en visionConfig, usarlo; si no existe, mostrar por defecto
    if (forceField in visionConfig) {
      return visionConfig[forceField as keyof typeof visionConfig] === true;
    }
    
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!carta || !participante) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/gamechanger/participantes"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver a Participantes
          </Link>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-green-500/20 rounded-xl">
                  <FileText size={32} className="text-green-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-white">Carta de Frutos</h1>
                    <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 rounded-full">
                      <CheckCircle2 size={16} className="text-green-400" />
                      <span className="text-sm text-green-400 font-medium">Autorizada</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      <span>{participante.nombre}</span>
                    </div>
                    <span>•</span>
                    <span>{participante.email}</span>
                  </div>
                </div>
              </div>
              
              {participante.mentor && (
                <div className="text-right">
                  <p className="text-xs text-slate-500 mb-1">Mentor</p>
                  <p className="text-sm font-medium text-white">{participante.mentor.nombre}</p>
                  <p className="text-xs text-slate-400">{participante.mentor.email}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Áreas */}
        <div className="space-y-4">{AREAS_CONFIG.filter(shouldShowArea).map((area) => {
            const Icon = area.icon;
            const colors = getColorClasses(area.color);
            const identidad = carta[`${area.key}Identidad` as keyof CartaData] as string | null;
            const declaracion = carta[`${area.key}Declaracion` as keyof CartaData] as string | null;
            const metas = getMetasForArea(area.key);
            const isExpanded = expandedAreas[area.key];

            return (
              <div
                key={area.key}
                className={`bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 ${colors.border} rounded-2xl overflow-hidden`}
              >
                {/* Area Header */}
                <button
                  onClick={() => toggleArea(area.key)}
                  className="w-full p-6 flex items-center justify-between hover:bg-slate-800/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 ${colors.bg} rounded-xl`}>
                      <Icon size={24} className={colors.icon} />
                    </div>
                    <div className="text-left">
                      <h3 className={`text-xl font-bold ${colors.text}`}>{area.label}</h3>
                      <p className="text-sm text-slate-400">
                        {metas.length} meta{metas.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={24} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={24} className="text-slate-400" />
                  )}
                </button>

                {/* Area Content */}
                {isExpanded && (
                  <div className="border-t border-slate-700 p-6 space-y-6">
                    
                    {/* Identidad */}
                    {identidad && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-400 mb-2">IDENTIDAD</h4>
                        <p className="text-white leading-relaxed">{identidad}</p>
                      </div>
                    )}

                    {/* Declaración */}
                    {declaracion && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-400 mb-2">DECLARACIÓN DE PODER</h4>
                        <p className={`text-lg font-medium ${colors.text} leading-relaxed`}>{declaracion}</p>
                      </div>
                    )}

                    {/* Metas */}
                    {metas.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-400">METAS Y ACCIONES</h4>
                        {metas.map((meta, index) => (
                          <div
                            key={meta.id}
                            className="bg-slate-900/50 border border-slate-700 rounded-xl p-5"
                          >
                            <div className="flex items-start gap-3 mb-4">
                              <div className={`flex items-center justify-center w-8 h-8 ${colors.bg} rounded-lg flex-shrink-0`}>
                                <Target size={16} className={colors.icon} />
                              </div>
                              <div className="flex-1">
                                {meta.declaracionPoder && (
                                  <p className="text-xs text-slate-500 mb-1">DECLARACIÓN: {meta.declaracionPoder}</p>
                                )}
                                <p className="text-white font-medium leading-relaxed">{meta.metaPrincipal}</p>
                                {meta.mentorFeedback && (
                                  <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                    <p className="text-xs text-blue-400 font-medium mb-1">Feedback del Mentor:</p>
                                    <p className="text-sm text-blue-300">{meta.mentorFeedback}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Acciones */}
                            {meta.Accion && meta.Accion.length > 0 && (
                              <div className="ml-11 space-y-2">
                                {meta.Accion.map((accion) => (
                                  <div
                                    key={accion.id}
                                    className="bg-slate-800/50 rounded-lg p-4"
                                  >
                                    <p className="text-slate-200 mb-3">{accion.texto}</p>
                                    
                                    <div className="flex flex-wrap gap-2 text-xs">
                                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">
                                        {FRECUENCIA_LABELS[accion.frequency] || accion.frequency}
                                      </span>
                                      
                                      {accion.frequency === 'WEEKLY' && accion.assignedDays.length > 0 && (
                                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                                          {accion.assignedDays.map(d => DIAS_SEMANA[d]).join(', ')}
                                        </span>
                                      )}
                                      
                                      {accion.specificDate && (
                                        <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-full">
                                          {new Date(accion.specificDate).toLocaleDateString('es-ES')}
                                        </span>
                                      )}
                                      
                                      {accion.requiereEvidencia && (
                                        <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded-full">
                                          Requiere evidencia
                                        </span>
                                      )}
                                      
                                      {accion.completada && (
                                        <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full">
                                          ✓ Completada
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
