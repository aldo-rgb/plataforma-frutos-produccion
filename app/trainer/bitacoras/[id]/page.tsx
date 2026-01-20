// Vista detallada de una Bitácora para el Trainer
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Loader2,
  ArrowLeft,
  Users,
  Activity,
  Clock,
  Heart,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  LifeBuoy,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface BitacoraDetail {
  participant: {
    id: number;
    nombre: string;
    email: string;
    imagen: string | null;
    telefono: string | null;
    edad: number | null;
    profesion: string | null;
  };
  vision: {
    id: number;
    nombre: string;
    advancedStartDate: string | null;
  };
  status: string;
  completedAt: string | null;
  lastSavedAt: string | null;
  currentDimension: number;
  alerts: {
    suicideRisk: boolean;
    flagReviewedAt: string | null;
    flagReviewedBy: { id: number; nombre: string } | null;
  };
  dimension1: any;
  dimension2: any;
  dimension3: any;
  dimension4: any;
  dimension5: any;
}

const DIMENSIONS = [
  { id: 1, name: 'Raíces y Relaciones', icon: Users, color: 'blue', key: 'dimension1' },
  { id: 2, name: 'El Cuerpo y la Sombra', icon: Activity, color: 'red', key: 'dimension2' },
  { id: 3, name: 'Línea de Vida', icon: Clock, color: 'amber', key: 'dimension3' },
  { id: 4, name: 'Espejos y Creencias', icon: Heart, color: 'pink', key: 'dimension4' },
  { id: 5, name: 'El Propósito', icon: Compass, color: 'emerald', key: 'dimension5' },
];

export default function BitacoraDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const participantId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BitacoraDetail | null>(null);
  const [activeDimension, setActiveDimension] = useState(1);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [markingReviewed, setMarkingReviewed] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && participantId) {
      loadBitacora();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, participantId]);

  const loadBitacora = async () => {
    try {
      const response = await fetch(`/api/trainer/bitacoras/${participantId}`);
      const result = await response.json();

      if (response.ok) {
        setData(result);
      } else {
        toast.error(result.error || 'Error al cargar la bitácora');
        router.push('/trainer/bitacoras');
      }
    } catch (error) {
      console.error('Error loading bitacora:', error);
      toast.error('Error al cargar la bitácora');
    } finally {
      setLoading(false);
    }
  };

  const markFlagAsReviewed = async () => {
    setMarkingReviewed(true);
    try {
      const response = await fetch(`/api/trainer/bitacoras/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast.success('Flag marcado como revisado');
        loadBitacora();
      }
    } catch (error) {
      toast.error('Error al marcar como revisado');
    } finally {
      setMarkingReviewed(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500 mx-auto mb-3" />
          <p className="text-gray-500">Cargando bitácora...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Bitácora no encontrada</p>
          <Link href="/trainer/bitacoras" className="text-purple-500 hover:underline mt-2 inline-block">
            Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  const currentDimension = DIMENSIONS.find(d => d.id === activeDimension);
  const dimensionData = data[currentDimension?.key as keyof BitacoraDetail];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Back button */}
        <Link
          href="/trainer/bitacoras"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver a la lista
        </Link>

        {/* Header with participant info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            {data.participant.imagen ? (
              <img
                src={data.participant.imagen}
                alt={data.participant.nombre}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                {data.participant.nombre.charAt(0)}
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {data.participant.nombre}
                </h1>
                {data.status === 'COMPLETED' && (
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Completada
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {data.participant.email}
                </span>
                {data.participant.telefono && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {data.participant.telefono}
                  </span>
                )}
                {data.participant.edad && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {data.participant.edad} años
                  </span>
                )}
                {data.participant.profesion && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {data.participant.profesion}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-2">
                {data.vision.nombre}
              </p>
            </div>

            {/* Suicide risk alert */}
            {data.alerts.suicideRisk && (
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                  <LifeBuoy className="w-5 h-5" />
                  <span className="font-semibold">Atención Especial Requerida</span>
                </div>
                <p className="text-xs text-red-500 dark:text-red-400/80 mb-3">
                  Este participante ha indicado un historial de riesgo. Procede con sensibilidad.
                </p>
                {data.alerts.flagReviewedAt ? (
                  <p className="text-xs text-gray-500">
                    Revisado por {data.alerts.flagReviewedBy?.nombre} el{' '}
                    {new Date(data.alerts.flagReviewedAt).toLocaleDateString()}
                  </p>
                ) : (
                  <button
                    onClick={markFlagAsReviewed}
                    disabled={markingReviewed}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                  >
                    {markingReviewed ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Shield className="w-3 h-3" />
                    )}
                    Marcar como revisado
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dimension tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {DIMENSIONS.map((dim) => {
            const Icon = dim.icon;
            const isActive = activeDimension === dim.id;

            return (
              <button
                key={dim.id}
                onClick={() => setActiveDimension(dim.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                  ${isActive
                    ? `bg-${dim.color}-500 text-white shadow-lg`
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
                style={isActive ? { backgroundColor: getColor(dim.color) } : {}}
              >
                <Icon className="w-4 h-4" />
                {dim.name}
              </button>
            );
          })}
        </div>

        {/* Dimension content */}
        <motion.div
          key={activeDimension}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
        >
          {/* Toggle sensitive data for dimension 2 */}
          {activeDimension === 2 && (
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Shield className="w-5 h-5" />
                <span className="text-sm">Información sensible</span>
              </div>
              <button
                onClick={() => setShowSensitiveData(!showSensitiveData)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {showSensitiveData ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Mostrar
                  </>
                )}
              </button>
            </div>
          )}

          {/* Render dimension content */}
          {renderDimensionContent(activeDimension, dimensionData, showSensitiveData)}
        </motion.div>
      </div>
    </div>
  );
}

// Helper to get color
function getColor(color: string): string {
  const colors: Record<string, string> = {
    blue: '#3b82f6',
    red: '#ef4444',
    amber: '#f59e0b',
    pink: '#ec4899',
    emerald: '#10b981',
  };
  return colors[color] || '#8b5cf6';
}

// Render dimension content
function renderDimensionContent(dimension: number, data: any, showSensitive: boolean) {
  if (!data?.data) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>Esta dimensión aún no ha sido completada</p>
      </div>
    );
  }

  const d = data.data;

  switch (dimension) {
    case 1: // Raíces y Relaciones
      return (
        <div className="space-y-6">
          <ResponseSection title="Estado Civil" value={translateMaritalStatus(d.estadoCivil)} />
          {d.relacionPareja && (
            <>
              <ResponseSection title="Relación con Pareja" value={d.relacionPareja} />
              {d.calificacionPareja && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Calificación:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${d.calificacionPareja * 10}%` }}
                      />
                    </div>
                    <span className="font-bold text-blue-500">{d.calificacionPareja}/10</span>
                  </div>
                </div>
              )}
            </>
          )}
          {d.tieneHijos && d.datosHijos?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Hijos</h4>
              <div className="space-y-3">
                {d.datosHijos.map((hijo: any, i: number) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex gap-4 text-sm mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">{hijo.name}</span>
                      <span className="text-gray-500">{hijo.age} años</span>
                    </div>
                    {hijo.relationship && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">{hijo.relationship}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <ResponseSection title="Relación con Padres" value={d.relacionPadres} />
          {d.cantidadHermanos > 0 && (
            <>
              <ResponseSection title="Hermanos" value={`${d.cantidadHermanos} hermano(s)`} />
              <ResponseSection title="Relación con Hermanos" value={d.relacionHermanos} />
            </>
          )}
          {d.tieneAcompanante && (
            <ResponseSection
              title="Acompañante en el Entrenamiento"
              value={`${d.nombreAcompanante} (${d.relacionAcompanante})`}
            />
          )}
        </div>
      );

    case 2: // Cuerpo y Sombra
      return (
        <div className="space-y-6">
          <ResponseSection title="Estado de Salud" value={showSensitive ? d.estadoSalud : '••••••••••'} />
          <ResponseSection title="Medicamentos" value={showSensitive ? d.medicamentos : '••••••••••'} />
          {d.embarazo !== null && d.embarazo !== undefined && (
            <ResponseSection title="Embarazo" value={d.embarazo ? 'Sí' : 'No'} />
          )}
          {d.intentoSuicidio && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Historial de Riesgo Reportado</span>
              </div>
              {showSensitive ? (
                <p className="text-sm text-gray-700 dark:text-gray-300">{d.razonSuicidio || 'No se proporcionaron detalles'}</p>
              ) : (
                <p className="text-sm text-gray-500">Contenido oculto - haz clic en "Mostrar" para ver</p>
              )}
            </div>
          )}
        </div>
      );

    case 3: // Línea de Vida
      return (
        <div className="space-y-8">
          <TimelineCard
            stage="Niñez"
            event={d.ninez?.evento}
            meaning={d.ninez?.significado}
            color="yellow"
          />
          <TimelineCard
            stage="Adolescencia"
            event={d.adolescencia?.evento}
            meaning={d.adolescencia?.significado}
            color="orange"
          />
          <TimelineCard
            stage="Adultez"
            event={d.adultez?.evento}
            meaning={d.adultez?.significado}
            color="purple"
          />
          <ResponseSection title="Influencia en su Vida Actual" value={d.influenciaActual} />
        </div>
      );

    case 4: // Espejos y Creencias
      return (
        <div className="space-y-6">
          <ResponseSection title="Cómo lo Describen Otros" value={d.percepcionExterna} />
          <ResponseSection title="Percepción de Amigos" value={d.percepcionAmigos} />
          <ResponseSection title="Creencias Religiosas" value={d.creenciasReligiosas} />
          <ResponseSection title="Educación y Creencias" value={d.educacionCreencias} />
          <ResponseSection title="Vida Profesional" value={d.trabajo} />
          <ResponseSection title="Detonantes/Triggers" value={d.detonantes} highlight />
        </div>
      );

    case 5: // El Propósito
      return (
        <div className="py-8">
          <div className="text-center mb-6">
            <Compass className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Su Propósito Declarado</h3>
          </div>
          <div className="p-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl">
            <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
              {d.proposito || 'No se ha definido aún'}
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}

// Helper components
function ResponseSection({ title, value, highlight = false }: { title: string; value: any; highlight?: boolean }) {
  if (!value) return null;
  
  return (
    <div className={highlight ? 'p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl' : ''}>
      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</h4>
      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function TimelineCard({ stage, event, meaning, color }: { stage: string; event: string; meaning: string; color: string }) {
  const bgColor = color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30' :
                  color === 'orange' ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30' :
                  'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30';
  
  return (
    <div className={`p-4 ${bgColor} border rounded-xl`}>
      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{stage}</h4>
      {event && (
        <div className="mb-3">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Evento</span>
          <p className="text-gray-700 dark:text-gray-300 mt-1">{event}</p>
        </div>
      )}
      {meaning && (
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wider">Significado</span>
          <p className="text-gray-700 dark:text-gray-300 mt-1">{meaning}</p>
        </div>
      )}
    </div>
  );
}

function translateMaritalStatus(status: string): string {
  const translations: Record<string, string> = {
    SINGLE: 'Soltero/a',
    MARRIED: 'Casado/a',
    DIVORCED: 'Divorciado/a',
    WIDOWED: 'Viudo/a',
    COMMON_LAW: 'Unión Libre',
    DATING: 'En una relación',
  };
  return translations[status] || status || 'No especificado';
}
