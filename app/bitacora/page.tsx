// Página principal de la Bitácora de Inicio (Cuestionario Avanzado)
// Experiencia inmersiva de introspección

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  Lock, 
  ChevronRight, 
  ChevronLeft,
  Save,
  Check,
  AlertTriangle,
  Heart,
  Users,
  Activity,
  Clock,
  Compass,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

// Componentes de dimensiones
import WelcomeScreen from './components/WelcomeScreen';
import Dimension1 from './components/Dimension1';
import Dimension2 from './components/Dimension2';
import Dimension3 from './components/Dimension3';
import Dimension4 from './components/Dimension4';
import Dimension5 from './components/Dimension5';
import CompletionScreen from './components/CompletionScreen';

interface QuestionnaireData {
  // Dimension 1
  maritalStatus?: string;
  partnerRelationship?: string;
  partnerRelationshipScore?: number;
  hasChildren?: boolean;
  childrenData?: Array<{name: string; age: number; relationship: string}>;
  parentsRelationship?: string;
  siblingsCount?: number;
  siblingsRelationship?: string;
  hasCompanion?: boolean;
  companionName?: string;
  companionRelation?: string;
  
  // Dimension 2
  healthStatus?: string;
  currentMedications?: string;
  isPregnant?: boolean;
  hasSuicideAttempt?: boolean;
  suicideAttemptReason?: string;
  
  // Dimension 3
  childhoodEvent?: string;
  childhoodMeaning?: string;
  adolescenceEvent?: string;
  adolescenceMeaning?: string;
  adulthoodEvent?: string;
  adulthoodMeaning?: string;
  eventsInfluence?: string;
  
  // Dimension 4
  externalPerception?: string;
  friendsPerception?: string;
  religiousBeliefs?: string;
  educationBeliefs?: string;
  workDescription?: string;
  triggers?: string;
  
  // Dimension 5
  lifePurpose?: string;
}

const DIMENSIONS = [
  { id: 0, name: 'Bienvenida', icon: Sparkles, color: 'from-purple-500 to-indigo-600' },
  { id: 1, name: 'Raíces y Relaciones', icon: Users, color: 'from-blue-500 to-cyan-600' },
  { id: 2, name: 'El Cuerpo y la Sombra', icon: Activity, color: 'from-red-500 to-orange-600' },
  { id: 3, name: 'Línea de Vida', icon: Clock, color: 'from-amber-500 to-yellow-600' },
  { id: 4, name: 'Espejos y Creencias', icon: Heart, color: 'from-pink-500 to-rose-600' },
  { id: 5, name: 'El Propósito', icon: Compass, color: 'from-emerald-500 to-teal-600' },
];

export default function BitacoraPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentDimension, setCurrentDimension] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [data, setData] = useState<QuestionnaireData>({});
  const [existingQuestionnaire, setExistingQuestionnaire] = useState<any>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [visionId, setVisionId] = useState<number | null>(null);
  
  // Anti-rush timer
  const [canProceed, setCanProceed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Cargar datos existentes
  useEffect(() => {
    if (status === 'authenticated') {
      loadQuestionnaire();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status]);

  const loadQuestionnaire = async () => {
    try {
      const response = await fetch('/api/bitacora');
      const result = await response.json();
      
      if (result.questionnaire) {
        setExistingQuestionnaire(result.questionnaire);
        setData(result.questionnaire);
        setCurrentDimension(result.questionnaire.currentDimension || 0);
        setVisionId(result.questionnaire.visionId);
        
        if (result.questionnaire.status === 'COMPLETED') {
          setIsCompleted(true);
        }
        
        // Si ya pasó la bienvenida, mostrar directamente
        if (result.questionnaire.currentDimension > 0) {
          setIsReady(true);
        }
      }
    } catch (error) {
      console.error('Error loading questionnaire:', error);
      toast.error('Error al cargar tu bitácora');
    } finally {
      setLoading(false);
    }
  };

  // Auto-save cada vez que cambian los datos
  const autoSave = useCallback(async (newData: QuestionnaireData, dimension: number) => {
    if (!session?.user?.id) return;
    
    setSaving(true);
    try {
      await fetch('/api/bitacora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'draft',
          dimension,
          data: newData,
          visionId,
        }),
      });
    } catch (error) {
      console.error('Error auto-saving:', error);
    } finally {
      setSaving(false);
    }
  }, [session, visionId]);

  // Actualizar datos y auto-guardar
  const updateData = (newData: Partial<QuestionnaireData>) => {
    const updated = { ...data, ...newData };
    setData(updated);
    // Debounce auto-save
    const timeout = setTimeout(() => {
      autoSave(updated, currentDimension);
    }, 1000);
    return () => clearTimeout(timeout);
  };

  // Timer anti-rush
  useEffect(() => {
    if (currentDimension > 0 && currentDimension < 6) {
      setCanProceed(false);
      setTimeLeft(10);
      
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanProceed(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [currentDimension]);

  const handleStartJourney = () => {
    setIsReady(true);
    setCurrentDimension(1);
    autoSave(data, 1);
  };

  const handleNext = async () => {
    if (!canProceed && currentDimension > 0 && currentDimension < 6) {
      toast.error('Tómate un momento para reflexionar...');
      return;
    }
    
    if (currentDimension < 5) {
      setCurrentDimension(prev => prev + 1);
      await autoSave(data, currentDimension + 1);
    } else {
      // Completar cuestionario
      await handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentDimension > 1) {
      setCurrentDimension(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/bitacora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          data,
          visionId,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setIsCompleted(true);
        toast.success('¡Tu bitácora ha sido sellada!');
      } else {
        toast.error(result.error || 'Error al completar');
      }
    } catch (error) {
      console.error('Error completing:', error);
      toast.error('Error al completar tu bitácora');
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Cargando tu bitácora...</p>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return <CompletionScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
      {/* Progress bar */}
      {isReady && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-1 bg-gray-800">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600"
              initial={{ width: '0%' }}
              animate={{ width: `${(currentDimension / 5) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          {/* Dimension indicators */}
          <div className="flex justify-center gap-2 mt-4 px-4">
            {DIMENSIONS.slice(1).map((dim) => {
              const Icon = dim.icon;
              const isActive = currentDimension === dim.id;
              const isCompleted = currentDimension > dim.id;
              
              return (
                <motion.div
                  key={dim.id}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                    transition-all duration-300
                    ${isActive ? `bg-gradient-to-r ${dim.color} text-white shadow-lg` : ''}
                    ${isCompleted ? 'bg-green-500/20 text-green-400' : ''}
                    ${!isActive && !isCompleted ? 'bg-gray-800/50 text-gray-500' : ''}
                  `}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dim.id * 0.1 }}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Icon className="w-3 h-3" />
                  )}
                  <span className="hidden sm:inline">{dim.name}</span>
                  <span className="sm:hidden">{dim.id}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Auto-save indicator */}
      {saving && (
        <div className="fixed top-16 right-4 z-50 flex items-center gap-2 text-xs text-gray-400 bg-gray-800/80 px-3 py-1.5 rounded-full">
          <Save className="w-3 h-3 animate-pulse" />
          Guardando...
        </div>
      )}

      {/* Main content */}
      <div className={`${isReady ? 'pt-24' : ''} px-4`}>
        <AnimatePresence mode="wait">
          {!isReady && (
            <WelcomeScreen key="welcome" onStart={handleStartJourney} />
          )}
          
          {isReady && currentDimension === 1 && (
            <Dimension1 
              key="dim1"
              data={data}
              onChange={updateData}
            />
          )}
          
          {isReady && currentDimension === 2 && (
            <Dimension2 
              key="dim2"
              data={data}
              onChange={updateData}
            />
          )}
          
          {isReady && currentDimension === 3 && (
            <Dimension3 
              key="dim3"
              data={data}
              onChange={updateData}
            />
          )}
          
          {isReady && currentDimension === 4 && (
            <Dimension4 
              key="dim4"
              data={data}
              onChange={updateData}
            />
          )}
          
          {isReady && currentDimension === 5 && (
            <Dimension5 
              key="dim5"
              data={data}
              onChange={updateData}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      {isReady && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentDimension <= 1}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                transition-all duration-200
                ${currentDimension <= 1 
                  ? 'opacity-0 pointer-events-none' 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }
              `}
            >
              <ChevronLeft className="w-5 h-5" />
              Anterior
            </button>

            {/* Anti-rush timer */}
            {!canProceed && timeLeft > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                Reflexiona... {timeLeft}s
              </div>
            )}

            <button
              onClick={handleNext}
              disabled={!canProceed && currentDimension > 0}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-lg font-medium
                transition-all duration-200
                ${canProceed || currentDimension === 0
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : currentDimension === 5 ? (
                <>
                  Sellar Bitácora
                  <Lock className="w-5 h-5" />
                </>
              ) : (
                <>
                  Siguiente
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
