'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import TribePollWidget from '@/app/components/TribePollWidget';
import TreasuryWidget from '@/components/captaincy/TreasuryWidget';
import ContextGuardianWidget from '@/components/captaincy/ContextGuardianWidget';
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Heart,
  BookMarked,
  UtensilsCrossed,
  Sparkle,
  Scale,
  PartyPopper,
  GraduationCap,
  Wallet,
  LucideIcon
} from 'lucide-react';

// Configuración de cada capitanía
const CAPTAINCY_CONFIG: Record<string, {
  name: string;
  description: string;
  pollCategory: 'FOOD' | 'GRADUATION' | 'RECOGNITION' | 'TRANSPORT' | 'GENERAL';
  icon: LucideIcon;
  color: string;
  features: string[];
}> = {
  FOOD: {
    name: 'Capitanía de Comidas',
    description: 'Organiza los convivios y comidas de la tribu',
    pollCategory: 'FOOD',
    icon: UtensilsCrossed,
    color: 'from-orange-600 to-red-600',
    features: [
      'Organizar convivios',
      'Coordinar comidas grupales',
      'Votaciones de menú',
      'Presupuesto de alimentos'
    ]
  },
  GRADUATION_CAPTAIN: {
    name: 'Capitanía de Graduación',
    description: 'Planifica la ceremonia de graduación de la tribu',
    pollCategory: 'GRADUATION',
    icon: PartyPopper,
    color: 'from-pink-600 to-purple-600',
    features: [
      'Planear ceremonia',
      'Votaciones de formato',
      'Coordinar invitados',
      'Organizar celebración'
    ]
  },
  BOOKS_MOVIES: {
    name: 'Capitanía de Libros y Películas',
    description: 'Gestiona los recursos educativos de la tribu',
    pollCategory: 'RECOGNITION',
    icon: BookMarked,
    color: 'from-blue-600 to-indigo-600',
    features: [
      'Recomendar materiales',
      'Organizar sesiones',
      'Club de lectura',
      'Votaciones de contenido'
    ]
  },
  CLEANLINESS: {
    name: 'Capitanía de Vestimenta y Limpieza',
    description: 'Cuida la imagen y presentación de la tribu',
    pollCategory: 'GENERAL',
    icon: Sparkle,
    color: 'from-cyan-600 to-teal-600',
    features: [
      'Estándares de vestimenta',
      'Organización de espacios',
      'Coordinación de limpieza',
      'Votaciones de normas'
    ]
  },
  CONTEXT_GUARDIAN: {
    name: 'Guardián del Contexto',
    description: 'Protege y mantiene el contexto de la visión',
    pollCategory: 'GENERAL',
    icon: Scale,
    color: 'from-emerald-600 to-green-600',
    features: [
      'Mediación de conflictos',
      'Mantener valores',
      'Votaciones éticas',
      'Guía de comportamiento'
    ]
  },
  CONTRIBUTION_BASIC: {
    name: 'Capitanía de Contribución Básicos',
    description: 'Coordina las contribuciones del nivel básico',
    pollCategory: 'GENERAL',
    icon: GraduationCap,
    color: 'from-yellow-600 to-orange-600',
    features: [
      'Coordinar contribuciones',
      'Apoyo a nuevos miembros',
      'Votaciones de apoyo',
      'Seguimiento de progreso'
    ]
  },
  CONTRIBUTION_ADVANCED: {
    name: 'Capitanía de Contribución Avanzados',
    description: 'Coordina las contribuciones del nivel avanzado',
    pollCategory: 'GENERAL',
    icon: GraduationCap,
    color: 'from-red-600 to-pink-600',
    features: [
      'Proyectos avanzados',
      'Mentoría de contribución',
      'Votaciones de proyectos',
      'Coordinación experta'
    ]
  },
  TREASURER: {
    name: 'Tesorería de Tribu',
    description: 'Gestiona las finanzas y recursos de la tribu',
    pollCategory: 'GENERAL',
    icon: Wallet,
    color: 'from-green-600 to-emerald-600',
    features: [
      'Control de presupuesto',
      'Votaciones de gastos',
      'Reportes financieros',
      'Coordinación de fondos'
    ]
  }
};

export default function CaptaincyWidgetPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const visionId = searchParams.get('visionId');
  const roleType = searchParams.get('roleType');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<{
    userId: number;
    userName: string;
    isCaptain: boolean;
    visionName: string;
  } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (!visionId || !roleType) {
      setError('Parámetros faltantes');
      setLoading(false);
      return;
    }

    if (!CAPTAINCY_CONFIG[roleType]) {
      setError('Tipo de capitanía no válido');
      setLoading(false);
      return;
    }

    // Verificar acceso
    const verifyAccess = async () => {
      try {
        const res = await fetch(`/api/legacy-vision-builder?visionId=${visionId}`);
        const data = await res.json();
        
        if (!res.ok || !data.hasAccess) {
          setError(data.message || 'No tienes acceso a esta visión');
          return;
        }

        // Verificar si es capitán de este rol
        const assignment = data.userAssignments?.find(
          (a: any) => a.roleType === roleType && a.status === 'ACCEPTED'
        );

        setUserData({
          userId: data.userId,
          userName: data.userName,
          isCaptain: !!assignment,
          visionName: data.visionName
        });
      } catch (err) {
        setError('Error al verificar acceso');
      } finally {
        setLoading(false);
      }
    };

    verifyAccess();
  }, [status, visionId, roleType, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error || !userData || !roleType || !visionId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center text-white p-8">
          <p className="text-red-400 mb-4">{error || 'Error desconocido'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const config = CAPTAINCY_CONFIG[roleType];
  const IconComponent = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <div className={`bg-gradient-to-r ${config.color} p-6`}>
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al Legacy Builder
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <IconComponent className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{config.name}</h1>
              <p className="text-white/80">{userData.visionName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Info del rol */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8 border border-white/20">
          <p className="text-white/90 mb-4">{config.description}</p>
          
          <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Funciones principales
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {config.features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-white/70 text-sm">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                {feature}
              </div>
            ))}
          </div>

          {userData.isCaptain && (
            <div className="mt-4 p-3 bg-green-500/20 rounded-lg border border-green-500/30">
              <p className="text-green-300 text-sm">
                ✅ Tienes rol de capitán activo - {roleType === 'TREASURER' ? 'Puedes gestionar la tesorería' : 'Puedes crear y gestionar votaciones'}
              </p>
            </div>
          )}
        </div>

        {/* Widget específico del Tesorero */}
        {roleType === 'TREASURER' ? (
          <TreasuryWidget
            visionId={parseInt(visionId)}
            visionName={userData.visionName}
            isTreasurer={userData.isCaptain}
          />
        ) : roleType === 'CONTEXT_GUARDIAN' ? (
          /* Widget del Guardián del Contexto */
          <ContextGuardianWidget
            visionId={parseInt(visionId)}
            visionName={userData.visionName}
            isGuardian={userData.isCaptain}
          />
        ) : (
          /* Widget de votaciones para otras capitanías */
          <TribePollWidget
            userId={userData.userId}
            visionId={parseInt(visionId)}
            category={config.pollCategory}
            captainType={roleType}
            onPollCreated={(poll) => {
              console.log('Encuesta creada:', poll);
            }}
            onVoteCast={(pollId, optionId) => {
              console.log('Voto emitido:', pollId, optionId);
            }}
          />
        )}
      </div>
    </div>
  );
}
