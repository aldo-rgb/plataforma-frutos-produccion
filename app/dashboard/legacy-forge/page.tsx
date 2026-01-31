'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Heart,
  ArrowLeft,
  Loader2,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  User,
  DollarSign,
  Calendar,
  Truck,
  Check,
  X,
  Plus,
  ChevronRight,
  Vote,
  Users,
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle,
  Map,
  Building,
  Lightbulb,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Clock,
  Target,
  Award,
  TreePine,
  Baby,
  Cat,
  GraduationCap,
  Stethoscope,
  Home,
  UtensilsCrossed,
  HelpCircle,
  Reply,
  Package,
  ShoppingCart,
  Car,
  Wrench,
  Shirt,
  Sparkle,
  Heart as HeartIcon,
  Gamepad2,
  MoreHorizontal,
} from 'lucide-react';
import Link from 'next/link';

// Categorías de logística
const logisticsCategoryLabels: Record<string, string> = {
  FOOD: 'Comida/Bebidas',
  TRANSPORT: 'Transporte',
  TOOLS: 'Herramientas',
  MATERIALS: 'Materiales',
  CLOTHING: 'Ropa/Uniformes',
  CLEANING: 'Limpieza',
  MEDICAL: 'Médico',
  ENTERTAINMENT: 'Entretenimiento',
  OTHER: 'Otro',
};

const logisticsCategoryIcons: Record<string, any> = {
  FOOD: UtensilsCrossed,
  TRANSPORT: Car,
  TOOLS: Wrench,
  MATERIALS: Package,
  CLOTHING: Shirt,
  CLEANING: Sparkle,
  MEDICAL: Stethoscope,
  ENTERTAINMENT: Gamepad2,
  OTHER: MoreHorizontal,
};

// Tipos
interface CommunityProject {
  id: number;
  name: string;
  description: string;
  category: string;
  locationName: string;
  locationAddress?: string;
  googleMapsUrl?: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  contactRole?: string;
  estimatedBudget?: number;
  logistics?: string;
  origin: string;
  coverImage?: string;
  status: string;
  proposedDate?: string;
  createdAt: string;
}

interface OrganizationLegacy {
  id: number;
  name: string;
  description: string;
  category: string;
  locationName: string;
  status: string;
  coverImage?: string;
  vision: { nombre: string };
}

interface PollOption {
  id: number;
  title: string;
  description?: string;
  imageUrl?: string;
  projectId?: number;
  project?: CommunityProject;
  _count: { votes: number };
}

interface Poll {
  id: number;
  title: string;
  description?: string;
  status: string;
  quorumPercentage: number;
  endDate?: string;
  options: PollOption[];
  _count: { votes: number; chatMessages: number };
  hasVoted?: boolean;
  userVoteOptionId?: number;
  tribeMembers?: number;
  participationPercentage?: number;
  quorumReached?: boolean;
}

interface ChatMessage {
  id: number;
  message: string;
  createdAt: string;
  user: {
    id: number;
    nombre: string;
    imagen?: string;
  };
  replyTo?: {
    id: number;
    message: string;
    user: { id: number; nombre: string };
  };
}

interface AIIdea {
  name: string;
  description: string;
  activityType: string;
  beneficiaries: string;
  estimatedBudget: number;
  budgetBreakdown: Array<{ item: string; cost: number }>; // Desglose del presupuesto
  duration: string;
  cause: string; // A qué causa pertenece
}

const categoryIcons: Record<string, any> = {
  CHILDREN: Baby,
  ELDERLY: Users,
  ANIMALS: Cat,
  ECOLOGICAL: TreePine,
  EDUCATION: GraduationCap,
  HEALTH: Stethoscope,
  HOUSING: Home,
  FOOD: UtensilsCrossed,
  OTHER: HelpCircle,
};

const categoryLabels: Record<string, string> = {
  CHILDREN: 'Niños',
  ELDERLY: 'Adultos Mayores',
  ANIMALS: 'Animales',
  ECOLOGICAL: 'Ecológico',
  EDUCATION: 'Educación',
  HEALTH: 'Salud',
  HOUSING: 'Vivienda',
  FOOD: 'Alimentación',
  OTHER: 'Otro',
};

export default function LegacyForgePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const visionId = searchParams.get('visionId');

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<'origin' | 'structure' | 'vote'>('origin');
  const [selectedPath, setSelectedPath] = useState<'continuity' | 'genesis' | null>(null);

  // Datos
  const [vision, setVision] = useState<any>(null);
  const [myProjects, setMyProjects] = useState<CommunityProject[]>([]);
  const [organizationLegacies, setOrganizationLegacies] = useState<OrganizationLegacy[]>([]);
  const [activePolls, setActivePolls] = useState<Poll[]>([]);
  const [tribeMembers, setTribeMembers] = useState(0);
  const [isCaptain, setIsCaptain] = useState(false);

  // AI Ideas - Génesis con 2 causas
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [aiIdeasCause1, setAiIdeasCause1] = useState<AIIdea[]>([]);
  const [aiIdeasCause2, setAiIdeasCause2] = useState<AIIdea[]>([]);
  const [ideaCause1, setIdeaCause1] = useState('');
  const [ideaCause2, setIdeaCause2] = useState('');
  const [ideaZone, setIdeaZone] = useState('');
  const [impactLevel, setImpactLevel] = useState<'small' | 'big' | ''>('');
  const [selectedIdeaCause1, setSelectedIdeaCause1] = useState<AIIdea | null>(null);
  const [selectedIdeaCause2, setSelectedIdeaCause2] = useState<AIIdea | null>(null);
  const [genesisStep, setGenesisStep] = useState<'select-causes' | 'view-ideas' | 'confirm-selection'>('select-causes');

  // Formulario de proyecto
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<CommunityProject | null>(null);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    category: 'OTHER',
    locationPending: false,
    locationName: '',
    locationAddress: '',
    googleMapsUrl: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    contactRole: '',
    estimatedBudget: '',
    logistics: '',
    proposedDate: '',
    coverImage: '',
  });
  const [logisticsItems, setLogisticsItems] = useState<Array<{
    id?: number;
    name: string;
    quantity: number;
    category: string;
    estimatedCost: string;
    notes: string;
  }>>([]);
  const [newLogisticsItem, setNewLogisticsItem] = useState({
    name: '',
    quantity: 1,
    category: 'OTHER',
    estimatedCost: '',
    notes: ''
  });
  const [savingProject, setSavingProject] = useState(false);

  // Votación
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [voting, setVoting] = useState(false);
  const [selectedProjectsForPoll, setSelectedProjectsForPoll] = useState<number[]>([]);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [pollTitle, setPollTitle] = useState('');

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user && visionId) {
      loadData();
    }
  }, [session, visionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/legacy-forge?visionId=${visionId}`);
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Error al cargar datos', 'error');
        return;
      }

      setVision(data.vision);
      setMyProjects(data.myProjects || []);
      setOrganizationLegacies(data.organizationLegacies || []);
      setActivePolls(data.activePolls || []);
      setTribeMembers(data.tribeMembers || 0);
      setIsCaptain(data.isCaptain);
    } catch (error) {
      console.error('Error:', error);
      showToast('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateAIIdeas = async () => {
    if (!ideaCause1.trim() || !ideaCause2.trim()) {
      showToast('Por favor selecciona las 2 causas que les mueven', 'error');
      return;
    }
    if (ideaCause1 === ideaCause2) {
      showToast('Las dos causas deben ser diferentes', 'error');
      return;
    }
    if (!impactLevel) {
      showToast('Por favor selecciona el nivel de impacto', 'error');
      return;
    }

    // Determinar rango de presupuesto según nivel de impacto
    const budgetRange = impactLevel === 'small' 
      ? { min: 10000, max: 20000, label: '$10,000 - $20,000 MXN' }
      : { min: 50000, max: 100000, label: '$50,000 - $100,000 MXN' };

    setGeneratingIdeas(true);
    setAiIdeasCause1([]);
    setAiIdeasCause2([]);
    
    try {
      // Generar ideas para ambas causas en paralelo
      const [res1, res2] = await Promise.all([
        fetch('/api/legacy-forge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate_ideas',
            visionId: parseInt(visionId!),
            cause: ideaCause1,
            zone: ideaZone,
            count: 3,
            budgetMin: budgetRange.min,
            budgetMax: budgetRange.max,
            impactLevel: impactLevel,
          }),
        }),
        fetch('/api/legacy-forge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate_ideas',
            visionId: parseInt(visionId!),
            cause: ideaCause2,
            zone: ideaZone,
            count: 3,
            budgetMin: budgetRange.min,
            budgetMax: budgetRange.max,
            impactLevel: impactLevel,
          }),
        })
      ]);

      const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

      if (data1.success && data2.success) {
        // Agregar la causa a cada idea para identificarlas
        const ideas1 = (data1.ideas || []).map((idea: AIIdea) => ({ ...idea, cause: ideaCause1 }));
        const ideas2 = (data2.ideas || []).map((idea: AIIdea) => ({ ...idea, cause: ideaCause2 }));
        
        setAiIdeasCause1(ideas1);
        setAiIdeasCause2(ideas2);
        setGenesisStep('view-ideas');
        showToast('¡Ideas generadas para ambas causas!', 'success');
      } else {
        showToast(data1.error || data2.error || 'Error al generar ideas', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const handleConfirmIdeasForVoting = async () => {
    if (!selectedIdeaCause1 || !selectedIdeaCause2) {
      showToast('Debes seleccionar una idea de cada causa', 'error');
      return;
    }

    setSavingProject(true);
    try {
      // Crear los 2 proyectos como propuestas
      const projects = [];
      
      for (const idea of [selectedIdeaCause1, selectedIdeaCause2]) {
        const budgetDescription = idea.budgetBreakdown 
          ? idea.budgetBreakdown.map(b => `• ${b.item}: $${b.cost.toLocaleString()}`).join('\n')
          : '';
        
        const res = await fetch('/api/legacy-forge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_project',
            visionId: parseInt(visionId!),
            name: idea.name,
            description: `${idea.description}\n\n📋 Actividad: ${idea.activityType}\n👥 Beneficiarios: ${idea.beneficiaries}\n⏱️ Duración: ${idea.duration}\n\n💰 Desglose de Presupuesto:\n${budgetDescription}`,
            category: getCategoryFromCause(idea.cause),
            estimatedBudget: String(idea.estimatedBudget),
            locationPending: true, // El lugar se define después de votar
            origin: 'NEW',
            aiGenerated: true,
            aiPrompt: idea.cause,
          }),
        });
        
        const data = await res.json();
        if (data.success) {
          projects.push(data.project);
        }
      }

      if (projects.length === 2) {
        // Crear la votación automáticamente
        const pollRes = await fetch('/api/legacy-forge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_poll',
            visionId: parseInt(visionId!),
            title: '¿Cuál será nuestro proyecto de impacto social?',
            projectIds: projects.map(p => p.id),
          }),
        });

        const pollData = await pollRes.json();
        
        if (pollData.success) {
          showToast('¡Proyectos creados y votación lista!', 'success');
          // Resetear el estado de génesis
          setSelectedIdeaCause1(null);
          setSelectedIdeaCause2(null);
          setAiIdeasCause1([]);
          setAiIdeasCause2([]);
          setGenesisStep('select-causes');
          setSelectedPath(null);
          setImpactLevel('');
          setIdeaCause1('');
          setIdeaCause2('');
          setIdeaZone('');
          await loadData();
          setCurrentPhase('vote');
        } else {
          showToast(pollData.error || 'Error al crear votación', 'error');
        }
      } else {
        showToast('Error al crear los proyectos', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setSavingProject(false);
    }
  };

  // Función auxiliar para mapear causa a categoría
  const getCategoryFromCause = (cause: string): string => {
    const mapping: Record<string, string> = {
      'Niños en situación vulnerable': 'CHILDREN',
      'Adultos mayores': 'ELDERLY',
      'Animales rescatados': 'ANIMALS',
      'Medio ambiente y ecología': 'ECOLOGICAL',
      'Educación comunitaria': 'EDUCATION',
      'Salud comunitaria': 'HEALTH',
      'Vivienda digna': 'HOUSING',
      'Alimentación y comedores': 'FOOD',
    };
    return mapping[cause] || 'OTHER';
  };

  const selectLegacyForContinuity = (legacy: OrganizationLegacy) => {
    setProjectForm({
      ...projectForm,
      name: `${legacy.name} - Fase 2`,
      description: `Continuación del proyecto: ${legacy.name}\n\n${legacy.description}`,
      category: legacy.category,
      locationName: legacy.locationName,
    });
    setShowProjectForm(true);
    setSelectedPath('continuity');
  };

  const handleSaveProject = async () => {
    // Validaciones
    if (!projectForm.name.trim() || !projectForm.description.trim()) {
      showToast('Nombre y descripción son requeridos', 'error');
      return;
    }
    // Solo validar ubicación y contacto si no está marcado como pendiente
    if (!projectForm.locationPending) {
      if (!projectForm.locationName.trim() || !projectForm.contactName.trim() || !projectForm.contactPhone.trim()) {
        showToast('Si el lugar no está pendiente, ubicación y datos de contacto son requeridos', 'error');
        return;
      }
    }

    setSavingProject(true);
    try {
      const res = await fetch('/api/legacy-forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingProject ? 'update_project' : 'create_project',
          visionId: parseInt(visionId!),
          projectId: editingProject?.id,
          ...projectForm,
          logisticsItems: logisticsItems,
          origin: selectedPath === 'continuity' ? 'CONTINUITY' : 'NEW',
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast(editingProject ? 'Proyecto actualizado' : 'Proyecto creado exitosamente', 'success');
        setShowProjectForm(false);
        setEditingProject(null);
        resetProjectForm();
        await loadData();
      } else {
        showToast(data.error || 'Error al guardar', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setSavingProject(false);
    }
  };

  const addLogisticsItem = () => {
    if (!newLogisticsItem.name.trim()) {
      showToast('El nombre del ítem es requerido', 'error');
      return;
    }
    setLogisticsItems([...logisticsItems, { ...newLogisticsItem }]);
    setNewLogisticsItem({
      name: '',
      quantity: 1,
      category: 'OTHER',
      estimatedCost: '',
      notes: ''
    });
  };

  const removeLogisticsItem = (index: number) => {
    setLogisticsItems(logisticsItems.filter((_, i) => i !== index));
  };

  const resetProjectForm = () => {
    setProjectForm({
      name: '',
      description: '',
      category: 'OTHER',
      locationPending: false,
      locationName: '',
      locationAddress: '',
      googleMapsUrl: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      contactRole: '',
      estimatedBudget: '',
      logistics: '',
      proposedDate: '',
      coverImage: '',
    });
    setLogisticsItems([]);
    setNewLogisticsItem({
      name: '',
      quantity: 1,
      category: 'OTHER',
      estimatedCost: '',
      notes: ''
    });
  };

  const handleCreatePoll = async () => {
    if (selectedProjectsForPoll.length < 2) {
      showToast('Selecciona al menos 2 proyectos para la votación', 'error');
      return;
    }

    setCreatingPoll(true);
    try {
      const res = await fetch('/api/legacy-forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_poll',
          visionId: parseInt(visionId!),
          title: pollTitle || '¿Cuál será nuestro proyecto de servicio comunitario?',
          projectIds: selectedProjectsForPoll,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast('Votación creada exitosamente', 'success');
        setSelectedProjectsForPoll([]);
        setPollTitle('');
        await loadData();
        setCurrentPhase('vote');
      } else {
        showToast(data.error || 'Error al crear votación', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setCreatingPoll(false);
    }
  };

  const handlePublishPoll = async (pollId: number) => {
    try {
      const res = await fetch('/api/legacy-forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish_poll',
          visionId: parseInt(visionId!),
          pollId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast('🎉 ' + data.message, 'success');
        await loadData();
      } else {
        showToast(data.error || 'Error', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    }
  };

  const handleVote = async (pollId: number, optionId: number) => {
    setVoting(true);
    try {
      const res = await fetch('/api/legacy-forge/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId, optionId }),
      });

      const data = await res.json();

      if (data.success) {
        showToast('✓ ' + data.message, 'success');
        await loadData();
        // Actualizar poll seleccionado
        if (selectedPoll) {
          const updatedPoll = activePolls.find(p => p.id === pollId);
          if (updatedPoll) setSelectedPoll({ ...updatedPoll, hasVoted: true, userVoteOptionId: optionId });
        }
      } else {
        showToast(data.error || 'Error al votar', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setVoting(false);
    }
  };

  const handleClosePoll = async (pollId: number) => {
    if (!confirm('¿Estás seguro de cerrar la votación? Se determinará el proyecto ganador.')) return;

    try {
      const res = await fetch('/api/legacy-forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close_poll',
          visionId: parseInt(visionId!),
          pollId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast('🏆 ' + data.message, 'success');
        await loadData();
      } else {
        showToast(data.error || 'Error', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    }
  };

  // Chat functions
  const loadChat = async (pollId: number) => {
    try {
      const res = await fetch(`/api/legacy-forge/chat?pollId=${pollId}`);
      const data = await res.json();
      setChatMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim() || !selectedPoll) return;

    setSendingMessage(true);
    try {
      const res = await fetch('/api/legacy-forge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId: selectedPoll.id,
          message: chatMessage,
          replyToId: replyingTo?.id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setChatMessages([...chatMessages, data.message]);
        setChatMessage('');
        setReplyingTo(null);
        // Scroll to bottom
        setTimeout(() => {
          chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      } else {
        showToast(data.error || 'Error al enviar mensaje', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    if (selectedPoll) {
      loadChat(selectedPoll.id);
      // Poll chat every 5 seconds while poll is open
      const interval = setInterval(() => {
        if (selectedPoll.status === 'ACTIVE') {
          loadChat(selectedPoll.id);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedPoll?.id]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-400">Cargando Legacy Forge...</p>
        </div>
      </div>
    );
  }

  if (!visionId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Visión no especificada</h1>
          <p className="text-gray-400 mb-6">Se requiere especificar la visión.</p>
          <Link
            href="/dashboard/legacy-vision-builder"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-emerald-950/10 to-black">
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-slide-in ${
          toast.type === 'success' ? 'bg-green-600' :
          toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        } text-white`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
           toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
           <Sparkles className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 py-6 px-4">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/dashboard/legacy-vision-builder"
            className="inline-flex items-center gap-2 text-emerald-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Legacy Vision Builder
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Legacy Forge</h1>
              <p className="text-emerald-200">
                {vision?.name} • Definiendo el Impacto Social
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación de fases */}
      <div className="bg-gray-900/50 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'origin', label: 'El Origen', icon: Lightbulb },
              { id: 'structure', label: 'Estructuración', icon: Building },
              { id: 'vote', label: 'La Elección', icon: Vote },
            ].map((phase) => {
              const Icon = phase.icon;
              const isActive = currentPhase === phase.id;
              return (
                <button
                  key={phase.id}
                  onClick={() => setCurrentPhase(phase.id as any)}
                  className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 transition-colors ${
                    isActive
                      ? 'bg-emerald-600/20 border-b-2 border-emerald-500 text-emerald-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden sm:inline">{phase.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* FASE 1: EL ORIGEN */}
        {currentPhase === 'origin' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-white mb-2">¿Qué camino tomará tu tribu?</h2>
              <p className="text-gray-400">Elige entre continuar un legado existente o crear uno nuevo</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* CAMINO 1: CONTINUIDAD */}
              <div
                className={`bg-gray-900 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedPath === 'continuity'
                    ? 'border-emerald-500 shadow-lg shadow-emerald-500/20'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
                onClick={() => setSelectedPath('continuity')}
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-emerald-600/20 rounded-xl">
                      <RefreshCw className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Continuidad</h3>
                      <p className="text-sm text-gray-400">Ecosistema Organización</p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    Continúa con un proyecto que necesita una segunda fase o mantenimiento.
                  </p>

                  {organizationLegacies.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {organizationLegacies.map((legacy) => {
                        const CategoryIcon = categoryIcons[legacy.category] || HelpCircle;
                        return (
                          <button
                            key={legacy.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectLegacyForContinuity(legacy);
                            }}
                            className="w-full p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl text-left transition-colors flex items-center gap-3"
                          >
                            <CategoryIcon className="w-5 h-5 text-emerald-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate">{legacy.name}</p>
                              <p className="text-xs text-gray-500">{legacy.locationName}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No hay legados activos en tu organización
                    </p>
                  )}
                </div>
              </div>

              {/* CAMINO 2: GÉNESIS */}
              <div
                className={`bg-gray-900 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedPath === 'genesis'
                    ? 'border-cyan-500 shadow-lg shadow-cyan-500/20'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
                onClick={() => setSelectedPath('genesis')}
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-cyan-600/20 rounded-xl">
                      <Sparkles className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Génesis</h3>
                      <p className="text-sm text-gray-400">Crear Nuevo Legado</p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    Selecciona 2 causas, la IA generará ideas y tu tribu votará.
                  </p>

                  {selectedPath === 'genesis' && genesisStep === 'select-causes' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Primera causa que les mueve *</label>
                        <select
                          value={ideaCause1}
                          onChange={(e) => setIdeaCause1(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                        >
                          <option value="">Selecciona la primera causa</option>
                          <option value="Niños en situación vulnerable">🧒 Niños</option>
                          <option value="Adultos mayores">👴 Adultos Mayores</option>
                          <option value="Animales rescatados">🐾 Animales</option>
                          <option value="Medio ambiente y ecología">🌳 Ecológico</option>
                          <option value="Educación comunitaria">📚 Educación</option>
                          <option value="Salud comunitaria">🏥 Salud</option>
                          <option value="Vivienda digna">🏠 Vivienda</option>
                          <option value="Alimentación y comedores">🍽️ Alimentación</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Segunda causa que les mueve *</label>
                        <select
                          value={ideaCause2}
                          onChange={(e) => setIdeaCause2(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                        >
                          <option value="">Selecciona la segunda causa</option>
                          <option value="Niños en situación vulnerable" disabled={ideaCause1 === 'Niños en situación vulnerable'}>🧒 Niños</option>
                          <option value="Adultos mayores" disabled={ideaCause1 === 'Adultos mayores'}>👴 Adultos Mayores</option>
                          <option value="Animales rescatados" disabled={ideaCause1 === 'Animales rescatados'}>🐾 Animales</option>
                          <option value="Medio ambiente y ecología" disabled={ideaCause1 === 'Medio ambiente y ecología'}>🌳 Ecológico</option>
                          <option value="Educación comunitaria" disabled={ideaCause1 === 'Educación comunitaria'}>📚 Educación</option>
                          <option value="Salud comunitaria" disabled={ideaCause1 === 'Salud comunitaria'}>🏥 Salud</option>
                          <option value="Vivienda digna" disabled={ideaCause1 === 'Vivienda digna'}>🏠 Vivienda</option>
                          <option value="Alimentación y comedores" disabled={ideaCause1 === 'Alimentación y comedores'}>🍽️ Alimentación</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Zona/Ciudad (opcional)</label>
                        <input
                          type="text"
                          value={ideaZone}
                          onChange={(e) => setIdeaZone(e.target.value)}
                          placeholder="Ej: Zona Norte de Monterrey"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                        />
                      </div>

                      {/* Nivel de Impacto */}
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">¿Qué nivel de impacto quieren tener? *</label>
                        <div className="grid grid-cols-1 gap-3">
                          {/* Opción Pequeño */}
                          <div
                            onClick={() => setImpactLevel('small')}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              impactLevel === 'small'
                                ? 'bg-emerald-900/30 border-emerald-500'
                                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                impactLevel === 'small' ? 'bg-emerald-500 border-emerald-500' : 'border-gray-500'
                              }`}>
                                {impactLevel === 'small' && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div>
                                <p className="text-white font-medium">🌱 Impacto Inicial</p>
                                <p className="text-emerald-400 font-bold text-lg">$10,000 - $20,000 MXN</p>
                                <p className="text-gray-400 text-xs mt-1">
                                  Perfecto para empezar. Proyectos alcanzables de 1 día.
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Opción Grande */}
                          <div
                            onClick={() => setImpactLevel('big')}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              impactLevel === 'big'
                                ? 'bg-purple-900/30 border-purple-500'
                                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                impactLevel === 'big' ? 'bg-purple-500 border-purple-500' : 'border-gray-500'
                              }`}>
                                {impactLevel === 'big' && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div>
                                <p className="text-white font-medium">🚀 Impacto Transformador</p>
                                <p className="text-purple-400 font-bold text-lg">$50,000 - $100,000 MXN</p>
                                <p className="text-gray-400 text-xs mt-1">
                                  ¡Vamos en grande! Confía en que como equipo lo lograrán.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={generateAIIdeas}
                        disabled={generatingIdeas || !ideaCause1 || !ideaCause2 || !impactLevel}
                        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {generatingIdeas ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generando ideas...
                          </>
                        ) : (
                          <>
                            <Lightbulb className="w-5 h-5" />
                            Generar 3 Ideas por Causa
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ideas generadas por IA - Nuevo flujo con 2 causas */}
            {selectedPath === 'genesis' && genesisStep === 'view-ideas' && (aiIdeasCause1.length > 0 || aiIdeasCause2.length > 0) && (
              <div className="space-y-6">
                {/* Instrucciones */}
                <div className="bg-cyan-900/20 border border-cyan-600/30 rounded-xl p-4 text-center">
                  <p className="text-cyan-300 font-medium">
                    ✨ Selecciona <span className="font-bold">1 idea de cada causa</span> para enviar a votación
                  </p>
                </div>

                {/* Ideas de la Causa 1 */}
                <div className="bg-gray-900 rounded-2xl border border-emerald-600/30 p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-emerald-400" />
                    Causa 1: {ideaCause1}
                  </h3>
                  <div className="grid gap-4">
                    {aiIdeasCause1.map((idea, index) => {
                      const isSelected = selectedIdeaCause1?.name === idea.name;
                      return (
                        <div
                          key={index}
                          className={`rounded-xl p-4 transition-all cursor-pointer border-2 ${
                            isSelected 
                              ? 'bg-emerald-900/30 border-emerald-500' 
                              : 'bg-gray-800/50 border-transparent hover:bg-gray-800 hover:border-gray-700'
                          }`}
                          onClick={() => setSelectedIdeaCause1(idea)}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                              isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'
                            }`}>
                              {isSelected && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-white">{idea.name}</h4>
                              <p className="text-gray-400 text-sm mt-1">{idea.description}</p>
                              
                              <div className="flex flex-wrap gap-2 mt-3">
                                <span className="px-2 py-1 bg-cyan-600/20 text-cyan-400 text-xs rounded-full">
                                  {idea.activityType}
                                </span>
                                <span className="px-2 py-1 bg-emerald-600/20 text-emerald-400 text-xs rounded-full">
                                  💰 ${idea.estimatedBudget.toLocaleString()} MXN
                                </span>
                                <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded-full">
                                  👥 {idea.beneficiaries}
                                </span>
                              </div>

                              {/* Desglose del presupuesto */}
                              {idea.budgetBreakdown && idea.budgetBreakdown.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-700">
                                  <p className="text-xs text-gray-500 mb-2 font-medium">💵 Desglose del presupuesto:</p>
                                  <div className="grid grid-cols-2 gap-1">
                                    {idea.budgetBreakdown.map((item, idx) => (
                                      <div key={idx} className="text-xs text-gray-400 flex justify-between">
                                        <span>{item.item}</span>
                                        <span className="text-emerald-400">${item.cost.toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ideas de la Causa 2 */}
                <div className="bg-gray-900 rounded-2xl border border-purple-600/30 p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-purple-400" />
                    Causa 2: {ideaCause2}
                  </h3>
                  <div className="grid gap-4">
                    {aiIdeasCause2.map((idea, index) => {
                      const isSelected = selectedIdeaCause2?.name === idea.name;
                      return (
                        <div
                          key={index}
                          className={`rounded-xl p-4 transition-all cursor-pointer border-2 ${
                            isSelected 
                              ? 'bg-purple-900/30 border-purple-500' 
                              : 'bg-gray-800/50 border-transparent hover:bg-gray-800 hover:border-gray-700'
                          }`}
                          onClick={() => setSelectedIdeaCause2(idea)}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                              isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-600'
                            }`}>
                              {isSelected && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-white">{idea.name}</h4>
                              <p className="text-gray-400 text-sm mt-1">{idea.description}</p>
                              
                              <div className="flex flex-wrap gap-2 mt-3">
                                <span className="px-2 py-1 bg-cyan-600/20 text-cyan-400 text-xs rounded-full">
                                  {idea.activityType}
                                </span>
                                <span className="px-2 py-1 bg-emerald-600/20 text-emerald-400 text-xs rounded-full">
                                  💰 ${idea.estimatedBudget.toLocaleString()} MXN
                                </span>
                                <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded-full">
                                  👥 {idea.beneficiaries}
                                </span>
                              </div>

                              {/* Desglose del presupuesto */}
                              {idea.budgetBreakdown && idea.budgetBreakdown.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-700">
                                  <p className="text-xs text-gray-500 mb-2 font-medium">💵 Desglose del presupuesto:</p>
                                  <div className="grid grid-cols-2 gap-1">
                                    {idea.budgetBreakdown.map((item, idx) => (
                                      <div key={idx} className="text-xs text-gray-400 flex justify-between">
                                        <span>{item.item}</span>
                                        <span className="text-purple-400">${item.cost.toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Botón para confirmar selección y crear votación */}
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setGenesisStep('select-causes');
                      setAiIdeasCause1([]);
                      setAiIdeasCause2([]);
                      setSelectedIdeaCause1(null);
                      setSelectedIdeaCause2(null);
                      setImpactLevel('');
                    }}
                    className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Cambiar causas
                  </button>
                  <button
                    onClick={handleConfirmIdeasForVoting}
                    disabled={!selectedIdeaCause1 || !selectedIdeaCause2 || savingProject}
                    className="flex-[2] py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {savingProject ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Vote className="w-5 h-5" />
                        Crear Votación con estas 2 Ideas
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Botón crear proyecto manual */}
            <div className="text-center">
              <button
                onClick={() => {
                  resetProjectForm();
                  setShowProjectForm(true);
                }}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Crear Proyecto Manualmente
              </button>
            </div>
          </div>
        )}

        {/* FASE 2: ESTRUCTURACIÓN */}
        {currentPhase === 'structure' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Mis Proyectos</h2>
                <p className="text-gray-400 text-sm">Estructura al menos 2 opciones para someter a votación</p>
              </div>
              <button
                onClick={() => {
                  resetProjectForm();
                  setEditingProject(null);
                  setShowProjectForm(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nuevo Proyecto
              </button>
            </div>

            {myProjects.length === 0 ? (
              <div className="text-center py-12 bg-gray-900 rounded-2xl border border-gray-800">
                <Building className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-400 mb-2">Sin proyectos</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Comienza creando propuestas de proyectos comunitarios
                </p>
                <button
                  onClick={() => setCurrentPhase('origin')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
                >
                  Ir a El Origen
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  {myProjects.filter(p => p.status === 'DRAFT').map((project) => {
                    const CategoryIcon = categoryIcons[project.category] || HelpCircle;
                    const isSelected = selectedProjectsForPoll.includes(project.id);
                    return (
                      <div
                        key={project.id}
                        className={`bg-gray-900 rounded-xl border-2 transition-all ${
                          isSelected ? 'border-emerald-500' : 'border-gray-800'
                        }`}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Checkbox para selección */}
                            <button
                              onClick={() => {
                                setSelectedProjectsForPoll(prev =>
                                  isSelected
                                    ? prev.filter(id => id !== project.id)
                                    : [...prev, project.id]
                                );
                              }}
                              className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-600'
                                  : 'border-gray-600 hover:border-emerald-500'
                              }`}
                            >
                              {isSelected && <Check className="w-4 h-4 text-white" />}
                            </button>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <CategoryIcon className="w-5 h-5 text-emerald-400" />
                                <h3 className="font-bold text-white">{project.name}</h3>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  project.status === 'DRAFT' ? 'bg-yellow-600/20 text-yellow-400' :
                                  project.status === 'APPROVED' ? 'bg-green-600/20 text-green-400' :
                                  'bg-gray-600/20 text-gray-400'
                                }`}>
                                  {project.status}
                                </span>
                              </div>
                              <p className="text-gray-400 text-sm line-clamp-2 mb-3">{project.description}</p>
                              
                              <div className="flex flex-wrap gap-3 text-sm">
                                <span className="flex items-center gap-1 text-gray-400">
                                  <MapPin className="w-4 h-4" />
                                  {project.locationName}
                                </span>
                                <span className="flex items-center gap-1 text-gray-400">
                                  <User className="w-4 h-4" />
                                  {project.contactName}
                                </span>
                                {project.estimatedBudget && (
                                  <span className="flex items-center gap-1 text-emerald-400">
                                    <DollarSign className="w-4 h-4" />
                                    ${Number(project.estimatedBudget).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Acciones */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingProject(project);
                                  setProjectForm({
                                    name: project.name,
                                    description: project.description,
                                    category: project.category,
                                    locationPending: !project.locationName,
                                    locationName: project.locationName || '',
                                    locationAddress: project.locationAddress || '',
                                    googleMapsUrl: project.googleMapsUrl || '',
                                    contactName: project.contactName || '',
                                    contactPhone: project.contactPhone || '',
                                    contactEmail: project.contactEmail || '',
                                    contactRole: project.contactRole || '',
                                    estimatedBudget: project.estimatedBudget ? String(project.estimatedBudget) : '',
                                    logistics: project.logistics || '',
                                    proposedDate: project.proposedDate ? project.proposedDate.split('T')[0] : '',
                                    coverImage: project.coverImage || '',
                                  });
                                  setShowProjectForm(true);
                                }}
                                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                              >
                                <Edit className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Botón crear votación */}
                {selectedProjectsForPoll.length >= 2 && (
                  <div className="bg-emerald-900/30 border border-emerald-600/30 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Crear Votación</h3>
                    <div className="mb-4">
                      <label className="text-sm text-gray-400 mb-2 block">Título de la votación</label>
                      <input
                        type="text"
                        value={pollTitle}
                        onChange={(e) => setPollTitle(e.target.value)}
                        placeholder="¿Cuál será nuestro proyecto de servicio comunitario?"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
                      />
                    </div>
                    <p className="text-gray-400 text-sm mb-4">
                      {selectedProjectsForPoll.length} proyectos seleccionados
                    </p>
                    <button
                      onClick={handleCreatePoll}
                      disabled={creatingPoll}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {creatingPoll ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Vote className="w-5 h-5" />
                          Crear Votación
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* FASE 3: LA ELECCIÓN (VOTACIÓN) */}
        {currentPhase === 'vote' && (
          <div className="space-y-6">
            {activePolls.length === 0 ? (
              <div className="text-center py-12 bg-gray-900 rounded-2xl border border-gray-800">
                <Vote className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-400 mb-2">Sin votaciones activas</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Primero crea proyectos y luego una votación
                </p>
                <button
                  onClick={() => setCurrentPhase('structure')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
                >
                  Ir a Estructuración
                </button>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Lista de votaciones */}
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-white">Votaciones</h2>
                  {activePolls.map((poll) => (
                    <div
                      key={poll.id}
                      onClick={() => setSelectedPoll(poll)}
                      className={`bg-gray-900 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        selectedPoll?.id === poll.id
                          ? 'border-emerald-500'
                          : 'border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-white">{poll.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          poll.status === 'ACTIVE' ? 'bg-green-600/20 text-green-400' :
                          poll.status === 'DRAFT' ? 'bg-yellow-600/20 text-yellow-400' :
                          'bg-gray-600/20 text-gray-400'
                        }`}>
                          {poll.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Vote className="w-4 h-4" />
                          {poll._count.votes} votos
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {poll._count.chatMessages} mensajes
                        </span>
                      </div>

                      {/* Botones de acción para el capitán */}
                      {isCaptain && (
                        <div className="flex gap-2 mt-3">
                          {poll.status === 'DRAFT' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePublishPoll(poll.id);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg"
                            >
                              Publicar
                            </button>
                          )}
                          {poll.status === 'ACTIVE' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClosePoll(poll.id);
                              }}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg"
                            >
                              Cerrar Votación
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Detalle de votación seleccionada */}
                {selectedPoll && (
                  <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                    {/* Opciones de votación */}
                    <div className="p-6 border-b border-gray-800">
                      <h3 className="font-bold text-white mb-4">{selectedPoll.title}</h3>
                      
                      {/* Barra de participación */}
                      <div className="mb-6">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Participación</span>
                          <span className={selectedPoll.quorumReached ? 'text-green-400' : 'text-yellow-400'}>
                            {selectedPoll.participationPercentage || 0}% ({selectedPoll.quorumPercentage}% requerido)
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              selectedPoll.quorumReached ? 'bg-green-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${Math.min(100, selectedPoll.participationPercentage || 0)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        {selectedPoll.options.map((option) => {
                          const isVoted = selectedPoll.userVoteOptionId === option.id;
                          const CategoryIcon = option.project?.category 
                            ? categoryIcons[option.project.category] || HelpCircle 
                            : HelpCircle;
                          
                          return (
                            <button
                              key={option.id}
                              onClick={() => {
                                if (selectedPoll.status === 'ACTIVE' && !selectedPoll.hasVoted) {
                                  if (confirm(`¿Estás seguro que esta es tu elección? ${option.title}`)) {
                                    handleVote(selectedPoll.id, option.id);
                                  }
                                }
                              }}
                              disabled={selectedPoll.status !== 'ACTIVE' || selectedPoll.hasVoted || voting}
                              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                isVoted
                                  ? 'border-emerald-500 bg-emerald-600/20'
                                  : selectedPoll.hasVoted
                                  ? 'border-gray-700 bg-gray-800/50 opacity-60'
                                  : 'border-gray-700 bg-gray-800/50 hover:border-emerald-500/50 hover:bg-gray-800'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <CategoryIcon className={`w-6 h-6 ${isVoted ? 'text-emerald-400' : 'text-gray-400'}`} />
                                <div className="flex-1">
                                  <p className={`font-bold ${isVoted ? 'text-emerald-400' : 'text-white'}`}>
                                    {option.title}
                                  </p>
                                  {option.project && (
                                    <p className="text-gray-500 text-sm">{option.project.locationName}</p>
                                  )}
                                </div>
                                {isVoted && <Check className="w-6 h-6 text-emerald-400" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {selectedPoll.hasVoted && (
                        <p className="text-center text-emerald-400 text-sm mt-4">
                          ✓ Ya emitiste tu voto
                        </p>
                      )}
                    </div>

                    {/* Chat de debate */}
                    {selectedPoll.status === 'ACTIVE' && (
                      <div className="p-4">
                        <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-emerald-400" />
                          Chat de Debate
                        </h4>
                        
                        {/* Mensajes */}
                        <div
                          ref={chatRef}
                          className="h-64 overflow-y-auto space-y-3 mb-4 p-3 bg-gray-800/50 rounded-xl"
                        >
                          {chatMessages.length === 0 ? (
                            <p className="text-gray-500 text-center text-sm py-8">
                              Sé el primero en comentar
                            </p>
                          ) : (
                            chatMessages.map((msg) => (
                              <div key={msg.id} className="flex items-start gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {msg.user.nombre.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white text-sm font-medium">{msg.user.nombre}</span>
                                    <span className="text-gray-500 text-xs">
                                      {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  {msg.replyTo && (
                                    <div className="bg-gray-700/50 rounded px-2 py-1 mb-1 text-xs text-gray-400 truncate">
                                      ↳ {msg.replyTo.user.nombre}: {msg.replyTo.message}
                                    </div>
                                  )}
                                  <p className="text-gray-300 text-sm break-words">{msg.message}</p>
                                </div>
                                <button
                                  onClick={() => setReplyingTo(msg)}
                                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                                >
                                  <Reply className="w-4 h-4 text-gray-500" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Input de mensaje */}
                        {replyingTo && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-t-xl text-sm">
                            <span className="text-gray-400">Respondiendo a {replyingTo.user.nombre}</span>
                            <button onClick={() => setReplyingTo(null)} className="ml-auto">
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        )}
                        <div className={`flex gap-2 ${replyingTo ? '' : ''}`}>
                          <input
                            type="text"
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                            placeholder="Escribe tu opinión..."
                            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm"
                          />
                          <button
                            onClick={sendChatMessage}
                            disabled={sendingMessage || !chatMessage.trim()}
                            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50"
                          >
                            {sendingMessage ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Send className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de formulario de proyecto */}
      {showProjectForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
              </h2>
              <button
                onClick={() => {
                  setShowProjectForm(false);
                  setEditingProject(null);
                }}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Información básica */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-emerald-400 uppercase">Información Básica</h3>
                
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Nombre del Proyecto *</label>
                  <input
                    type="text"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    placeholder="Ej: Techo Digno"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Descripción del Impacto *</label>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    placeholder="¿Qué vamos a hacer exactamente? (Pintar, construir, limpiar...)"
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Categoría</label>
                  <select
                    value={projectForm.category}
                    onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ubicación */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-emerald-400 uppercase flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Ubicación
                </h3>
                
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Nombre del Lugar *</label>
                  <input
                    type="text"
                    value={projectForm.locationName}
                    onChange={(e) => setProjectForm({ ...projectForm, locationName: e.target.value })}
                    placeholder="Ej: Casa Hogar Los Pequeños"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Dirección</label>
                  <input
                    type="text"
                    value={projectForm.locationAddress}
                    onChange={(e) => setProjectForm({ ...projectForm, locationAddress: e.target.value })}
                    placeholder="Calle, número, colonia, ciudad"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Link de Google Maps</label>
                  <input
                    type="url"
                    value={projectForm.googleMapsUrl}
                    onChange={(e) => setProjectForm({ ...projectForm, googleMapsUrl: e.target.value })}
                    placeholder="https://maps.google.com/..."
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* Contacto */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-emerald-400 uppercase flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Contacto del Lugar
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Nombre *</label>
                    <input
                      type="text"
                      value={projectForm.contactName}
                      onChange={(e) => setProjectForm({ ...projectForm, contactName: e.target.value })}
                      placeholder="María García"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Rol/Puesto</label>
                    <input
                      type="text"
                      value={projectForm.contactRole}
                      onChange={(e) => setProjectForm({ ...projectForm, contactRole: e.target.value })}
                      placeholder="Directora"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Teléfono *</label>
                    <input
                      type="tel"
                      value={projectForm.contactPhone}
                      onChange={(e) => setProjectForm({ ...projectForm, contactPhone: e.target.value })}
                      placeholder="81 1234 5678"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Email</label>
                    <input
                      type="email"
                      value={projectForm.contactEmail}
                      onChange={(e) => setProjectForm({ ...projectForm, contactEmail: e.target.value })}
                      placeholder="contacto@ejemplo.com"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Presupuesto y Logística */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-emerald-400 uppercase flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Presupuesto y Logística
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Presupuesto Estimado (MXN)</label>
                    <input
                      type="number"
                      value={projectForm.estimatedBudget}
                      onChange={(e) => setProjectForm({ ...projectForm, estimatedBudget: e.target.value })}
                      placeholder="15000"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Fecha Propuesta</label>
                    <input
                      type="date"
                      value={projectForm.proposedDate}
                      onChange={(e) => setProjectForm({ ...projectForm, proposedDate: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Logística Requerida</label>
                  <textarea
                    value={projectForm.logistics}
                    onChange={(e) => setProjectForm({ ...projectForm, logistics: e.target.value })}
                    placeholder="Ej: Necesitamos 3 camionetas, 20 brochas, pintura blanca..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white resize-none"
                  />
                </div>
              </div>

              {/* Botón guardar */}
              <button
                onClick={handleSaveProject}
                disabled={savingProject}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {savingProject ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {editingProject ? 'Guardar Cambios' : 'Crear Proyecto'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
