'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Shirt, Palette, Vote, Upload, Image as ImageIcon, 
  Users, CheckCircle, ArrowLeft, Loader2, Plus, X,
  Trophy, BarChart3, Clock, Sparkles, Wand2
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Componente interno que usa useSearchParams
function IdentityLabContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const visionId = searchParams.get('visionId');
  
  const [loading, setLoading] = useState(true);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [visionData, setVisionData] = useState<{ nombre: string; tribeLogoUrl?: string | null } | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [userPermissions, setUserPermissions] = useState({ canCreate: false, canManage: false, isCaptain: false });
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para selector de talla en votaciones (SIEMPRE se pide talla)
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [votingOptionId, setVotingOptionId] = useState<number | null>(null);
  const [showSizeSelector, setShowSizeSelector] = useState(false);
  const [currentVotingPollId, setCurrentVotingPollId] = useState<number | null>(null);
  
  // Estado para generación de logos con AI
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiTribeName, setAiTribeName] = useState('');
  const [aiTribeDescription, setAiTribeDescription] = useState('');
  const [generatingLogos, setGeneratingLogos] = useState(false);
  const [generatedLogos, setGeneratedLogos] = useState<{ title: string; imageUrl: string; style: string }[]>([]);
  const [selectedAILogos, setSelectedAILogos] = useState<number[]>([]);
  
  // Estado para ver listado de tallas
  const [showSizesList, setShowSizesList] = useState(false);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [sizesData, setSizesData] = useState<{
    totalMembers: number;
    summary: Record<string, number>;
    sizes: Array<{
      size: string;
      count: number;
      users: Array<{ userId: number; nombre: string; profileImage: string | null }>;
    }>;
  } | null>(null);
  
  // Estado para subir logo final directamente
  const [showUploadFinalLogo, setShowUploadFinalLogo] = useState(false);
  const [finalLogoFile, setFinalLogoFile] = useState<File | null>(null);
  const [finalLogoPreview, setFinalLogoPreview] = useState<string | null>(null);
  const [uploadingFinalLogo, setUploadingFinalLogo] = useState(false);
  const [finalLogoUrl, setFinalLogoUrl] = useState<string | null>(null);
  
  // Estado para cerrar votación
  const [closingPollId, setClosingPollId] = useState<number | null>(null);
  
  const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  
  // Form para nueva votación
  const [pollTitle, setPollTitle] = useState('');
  const [pollDescription, setPollDescription] = useState('');
  const [pollOptions, setPollOptions] = useState<{ title: string; imageUrl: string; file?: File; uploading?: boolean }[]>([
    { title: '', imageUrl: '' },
    { title: '', imageUrl: '' }
  ]);

  interface PollOption {
    id: number;
    title: string;
    imageUrl?: string;
    _count: { votes: number };
  }

  interface Poll {
    id: number;
    title: string;
    description?: string;
    category: string;
    status: 'PENDING' | 'ACTIVE' | 'CLOSED';
    options: PollOption[];
    _count: { votes: number };
    hasVoted: boolean;
    createdAt: string;
    stats?: {
      tribeMembers: number;
      totalVotes: number;
      participationPercentage: number;
      quorumReached: boolean;
    };
  }

  const fetchData = useCallback(async () => {
    if (!visionId) return;
    
    try {
      setLoading(true);
      
      // Obtener info de la visión
      const visionRes = await fetch(`/api/legacy-vision-builder?visionId=${visionId}`);
      const visionJson = await visionRes.json();
      if (visionJson.vision) {
        setVisionData(visionJson.vision);
      }
      
      // Obtener solo votaciones de LOGO
      const logoPollsRes = await fetch(`/api/tribe-polls?visionId=${visionId}&category=LOGO`);
      const logoJson = await logoPollsRes.json();
      
      setPolls(logoJson.polls || []);
      
      // Obtener permisos del usuario
      if (logoJson.userPermissions) {
        setUserPermissions(logoJson.userPermissions);
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [visionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshPolls = async () => {
    if (!visionId) return;
    try {
      setLoadingPolls(true);
      const logoPollsRes = await fetch(`/api/tribe-polls?visionId=${visionId}&category=LOGO`);
      const logoJson = await logoPollsRes.json();
      setPolls(logoJson.polls || []);
    } catch (err) {
      console.error('Error refreshing polls:', err);
    } finally {
      setLoadingPolls(false);
    }
  };

  // Función para cerrar una votación
  const closePoll = async (pollId: number, participationPercentage: number) => {
    if (participationPercentage < 80) {
      setError('Se requiere al menos 80% de participación para cerrar la votación');
      return;
    }
    
    try {
      setClosingPollId(pollId);
      setError(null);
      
      const res = await fetch('/api/tribe-polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close',
          pollId
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      // Refrescar la lista de votaciones
      await refreshPolls();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar la votación');
    } finally {
      setClosingPollId(null);
    }
  };

  // Función para subir imagen de una opción
  const uploadOptionImage = async (idx: number, file: File) => {
    const updated = [...pollOptions];
    updated[idx].uploading = true;
    updated[idx].file = file;
    setPollOptions(updated);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('visionId', visionId || '');
      formData.append('type', 'logo');

      const res = await fetch('/api/identity-lab/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      const updatedAfter = [...pollOptions];
      updatedAfter[idx].imageUrl = data.url;
      updatedAfter[idx].uploading = false;
      setPollOptions(updatedAfter);
    } catch (err) {
      console.error('Error uploading image:', err);
      const updatedError = [...pollOptions];
      updatedError[idx].uploading = false;
      updatedError[idx].file = undefined;
      setPollOptions(updatedError);
      setError('Error al subir imagen');
    }
  };

  const createPoll = async () => {
    if (!pollTitle.trim() || pollOptions.filter(o => o.title.trim()).length < 2) {
      setError('Se necesita título y al menos 2 opciones');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      // Siempre usar categoría LOGO
      const category = 'LOGO';
      
      const res = await fetch('/api/tribe-polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          visionId: parseInt(visionId!),
          title: pollTitle,
          description: pollDescription,
          category: category,
          options: pollOptions.filter(o => o.title.trim()).map(o => ({
            title: o.title,
            imageUrl: o.imageUrl || undefined
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowCreatePoll(false);
      setPollTitle('');
      setPollDescription('');
      setPollOptions([{ title: '', imageUrl: '' }, { title: '', imageUrl: '' }]);
      await refreshPolls();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear votación');
    } finally {
      setSubmitting(false);
    }
  };

  // Función para iniciar votación (SIEMPRE pide talla para playera)
  const handleVoteClick = (poll: Poll, optionId: number) => {
    // Siempre mostrar selector de talla
    setCurrentVotingPollId(poll.id);
    setVotingOptionId(optionId);
    setSelectedSize('');
    setShowSizeSelector(true);
  };

  // Confirmar voto con talla seleccionada
  const confirmVoteWithSize = async () => {
    if (!selectedSize || !currentVotingPollId || !votingOptionId) {
      setError('Debes seleccionar tu talla');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/tribe-polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vote',
          pollId: currentVotingPollId,
          optionId: votingOptionId,
          shirtSize: selectedSize
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowSizeSelector(false);
      setSelectedSize('');
      setVotingOptionId(null);
      setCurrentVotingPollId(null);
      await refreshPolls();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al votar');
    } finally {
      setSubmitting(false);
    }
  };

  const castVote = async (pollId: number, optionId: number, shirtSize?: string) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/tribe-polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vote',
          pollId,
          optionId,
          shirtSize: shirtSize || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await refreshPolls();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al votar');
    } finally {
      setSubmitting(false);
    }
  };

  // Función para cargar el listado de tallas
  const loadShirtSizes = async () => {
    if (!visionId) return;
    
    setLoadingSizes(true);
    try {
      const res = await fetch(`/api/identity-lab/shirt-sizes?visionId=${visionId}`);
      const data = await res.json();
      
      if (data.success) {
        setSizesData(data);
      }
    } catch (err) {
      console.error('Error loading sizes:', err);
    } finally {
      setLoadingSizes(false);
    }
  };

  // Función para manejar selección de archivo de logo final
  const handleFinalLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFinalLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setFinalLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Función para subir el logo final
  const uploadFinalLogo = async () => {
    if (!finalLogoFile || !visionId) return;

    try {
      setUploadingFinalLogo(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', finalLogoFile);
      formData.append('visionId', visionId);
      formData.append('type', 'final-logo');

      const res = await fetch('/api/identity-lab/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFinalLogoUrl(data.url);
      
      // Guardar el logo como el logo oficial de la tribu
      const saveRes = await fetch('/api/legacy-vision-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visionId: parseInt(visionId),
          action: 'updateTribeLogo',
          logoUrl: data.url
        })
      });

      const saveData = await saveRes.json();
      
      if (saveRes.ok) {
        // Actualizar el estado local con el nuevo logo
        setVisionData(prev => prev ? { ...prev, tribeLogoUrl: data.url } : null);
        
        // Mostrar éxito y cerrar modal
        setShowUploadFinalLogo(false);
        setFinalLogoFile(null);
        setFinalLogoPreview(null);
        setFinalLogoUrl(null);
      } else {
        throw new Error(saveData.error || 'Error al guardar el logo');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir logo');
    } finally {
      setUploadingFinalLogo(false);
    }
  };

  // Función para generar logos con AI
  const generateLogosWithAI = async () => {
    if (!aiTribeName.trim()) {
      setError('Ingresa el nombre de la tribu');
      return;
    }

    try {
      setGeneratingLogos(true);
      setError(null);
      setGeneratedLogos([]);
      setSelectedAILogos([]);

      const res = await fetch('/api/identity-lab/generate-logos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tribeName: aiTribeName,
          tribeDescription: aiTribeDescription,
          visionId: visionId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setGeneratedLogos(data.logos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar logos');
    } finally {
      setGeneratingLogos(false);
    }
  };

  // Toggle selección de logo AI
  const toggleAILogoSelection = (index: number) => {
    if (selectedAILogos.includes(index)) {
      setSelectedAILogos(selectedAILogos.filter(i => i !== index));
    } else if (selectedAILogos.length < 2) {
      setSelectedAILogos([...selectedAILogos, index]);
    } else {
      // Reemplazar el primero seleccionado
      setSelectedAILogos([selectedAILogos[1], index]);
    }
  };

  // Crear votación con logos AI seleccionados
  const createPollFromAILogos = async () => {
    if (selectedAILogos.length !== 2) {
      setError('Debes seleccionar exactamente 2 logos');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const selectedOptions = selectedAILogos.map((idx, i) => ({
        title: `Diseño ${i + 1}`,
        imageUrl: generatedLogos[idx].imageUrl
      }));

      const res = await fetch('/api/tribe-polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          visionId: parseInt(visionId!),
          title: `¿Cuál será el logo oficial de ${aiTribeName}?`,
          description: aiTribeDescription || 'Vota por tu diseño favorito',
          category: 'LOGO',
          options: selectedOptions
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Limpiar estado y cerrar modal
      setShowAIGenerator(false);
      setAiTribeName('');
      setAiTribeDescription('');
      setGeneratedLogos([]);
      setSelectedAILogos([]);
      await refreshPolls();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear votación');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visionId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No se especificó una visión</p>
          <Link href="/dashboard/legacy-vision-builder" className="text-purple-400 hover:text-purple-300">
            ← Volver a Capitanías
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/legacy-vision-builder')}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-4"
          >
            <ArrowLeft size={20} />
            Volver a Capitanías
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Palette size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Identity Lab</h1>
              <p className="text-gray-400">
                {visionData?.nombre || 'Cargando...'} • Logo de la Tribu
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 flex items-center justify-between">
            <span className="text-red-300">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X size={20} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Votaciones activas */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Vote size={24} className="text-purple-400" />
                Votaciones de Logo
                {loadingPolls && <Loader2 size={18} className="animate-spin text-purple-400" />}
              </h2>
              
              {userPermissions.canCreate && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAIGenerator(true)}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg flex items-center gap-2 shadow-lg shadow-purple-500/30"
                  >
                    <Sparkles size={18} />
                    Generar con AI
                  </button>
                  <button
                    onClick={() => setShowCreatePoll(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Nueva Votación
                  </button>
                </div>
              )}
            </div>

            {loadingPolls ? (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
                <Loader2 size={48} className="mx-auto text-purple-400 animate-spin mb-4" />
                <p className="text-gray-400 text-lg">Cargando votaciones...</p>
              </div>
            ) : polls.length === 0 ? (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
                <Vote size={48} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400 text-lg">
                  No hay votaciones de logo activas
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  {userPermissions.canCreate 
                    ? 'Crea una nueva votación de logo para que la tribu decida'
                    : 'El capitán de identidad creará votaciones pronto'
                  }
                </p>
              </div>
            ) : (
              polls.map((poll) => (
                <div key={poll.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  <div className="p-5 border-b border-gray-800">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`px-3 py-1 text-xs rounded-full mb-2 inline-block ${
                          poll.status === 'ACTIVE' 
                            ? 'bg-green-500/20 text-green-300' 
                            : poll.status === 'CLOSED'
                            ? 'bg-gray-500/20 text-gray-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {poll.status === 'ACTIVE' ? '🗳️ Votación Abierta' : 
                           poll.status === 'CLOSED' ? '✅ Finalizada' : '⏳ Pendiente'}
                        </span>
                        <h3 className="text-lg font-bold text-white">{poll.title}</h3>
                        {poll.description && (
                          <p className="text-gray-400 text-sm mt-1">{poll.description}</p>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <Users size={14} className="inline mr-1" />
                        {poll._count.votes} votos
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-4">
                      {poll.options.map((option) => {
                        const totalVotes = poll._count?.votes || 1;
                        const optionVotes = option._count?.votes || 0;
                        const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                        const isWinner = poll.status === 'CLOSED' && 
                          optionVotes === Math.max(...poll.options.map(o => o._count?.votes || 0));
                        
                        return (
                          <div
                            key={option.id}
                            className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                              isWinner 
                                ? 'border-yellow-500 bg-yellow-500/10' 
                                : 'border-gray-700 hover:border-purple-500/50'
                            }`}
                          >
                            {option.imageUrl && (
                              <div className="aspect-square relative bg-gray-800">
                                <Image
                                  src={option.imageUrl}
                                  alt={option.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-white flex items-center gap-2">
                                  {isWinner && <Trophy size={16} className="text-yellow-400" />}
                                  {option.title}
                                </span>
                                <span className="text-sm text-gray-400">
                                  {percentage}%
                                </span>
                              </div>
                              
                              <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isWinner ? 'bg-yellow-500' : 'bg-purple-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              
                              {poll.status === 'ACTIVE' && !poll.hasVoted && (
                                <button
                                  onClick={() => handleVoteClick(poll, option.id)}
                                  disabled={submitting}
                                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                >
                                  Votar y elegir talla
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {poll.hasVoted && poll.status === 'ACTIVE' && (
                      <div className="mt-4 text-center text-green-400 text-sm flex items-center justify-center gap-2">
                        <CheckCircle size={16} />
                        Ya emitiste tu voto
                      </div>
                    )}
                    
                    {/* Sección de cerrar votación para el capitán */}
                    {userPermissions.canManage && poll.status === 'ACTIVE' && poll.stats && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400">Participación de la tribu:</span>
                          <span className={`text-sm font-bold ${
                            poll.stats.participationPercentage >= 80 
                              ? 'text-green-400' 
                              : 'text-yellow-400'
                          }`}>
                            {poll.stats.participationPercentage}% ({poll.stats.totalVotes}/{poll.stats.tribeMembers})
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              poll.stats.participationPercentage >= 80 
                                ? 'bg-green-500' 
                                : 'bg-yellow-500'
                            }`}
                            style={{ width: `${Math.min(poll.stats.participationPercentage, 100)}%` }}
                          />
                        </div>
                        <button
                          onClick={() => closePoll(poll.id, poll.stats?.participationPercentage || 0)}
                          disabled={closingPollId === poll.id || poll.stats.participationPercentage < 80}
                          className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                            poll.stats.participationPercentage >= 80 && closingPollId !== poll.id
                              ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {closingPollId === poll.id ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Cerrando votación...
                            </>
                          ) : poll.stats.participationPercentage >= 80 ? (
                            <>
                              🔒 Cerrar Votación
                            </>
                          ) : (
                            <>
                              🔒 Requiere 80% de participación
                            </>
                          )}
                        </button>
                        {poll.stats.participationPercentage < 80 && (
                          <p className="text-center text-xs text-gray-500 mt-2">
                            Faltan {Math.ceil(poll.stats.tribeMembers * 0.8 - poll.stats.totalVotes)} votos para poder cerrar
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Info del rol */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <Shirt size={20} className="text-pink-400" />
                Capitán de Identidad
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Encargado de la identidad visual de la tribu. Gestiona las votaciones 
                para elegir el logo oficial. Al votar, los miembros también registran su talla de playera.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <CheckCircle size={14} className="text-green-400" />
                  Crear votaciones de logo
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <CheckCircle size={14} className="text-green-400" />
                  Generar logos con AI
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <CheckCircle size={14} className="text-green-400" />
                  Recolectar tallas de miembros
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <BarChart3 size={20} className="text-purple-400" />
                Estadísticas
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Votaciones activas</span>
                  <span className="text-white font-bold">
                    {polls.filter(p => p.status === 'ACTIVE').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Finalizadas</span>
                  <span className="text-white font-bold">
                    {polls.filter(p => p.status === 'CLOSED').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total de votos</span>
                  <span className="text-white font-bold">
                    {polls.reduce((sum, p) => sum + p._count.votes, 0)}
                  </span>
                </div>
              </div>
              
              {/* Botón ver tallas */}
              {userPermissions.isCaptain && (
                <button
                  onClick={() => {
                    setShowSizesList(true);
                    loadShirtSizes();
                  }}
                  className="w-full mt-4 py-2 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Shirt size={18} />
                  Ver Listado de Tallas
                </button>
              )}
              
              {/* Botón subir logo final */}
              {userPermissions.isCaptain && (
                <button
                  onClick={() => setShowUploadFinalLogo(true)}
                  className="w-full mt-3 py-2 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Upload size={18} />
                  Subir Logo Final
                </button>
              )}
            </div>

            {/* Logo Oficial de la Tribu */}
            {visionData?.tribeLogoUrl && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Trophy size={20} className="text-yellow-400" />
                  Logo Oficial de la Tribu
                </h3>
                <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-yellow-500/50 bg-gray-800">
                  <Image
                    src={visionData.tribeLogoUrl}
                    alt="Logo oficial de la tribu"
                    fill
                    className="object-contain p-2"
                  />
                </div>
                <p className="text-center text-xs text-gray-500 mt-3">
                  Este es el logo oficial seleccionado para la tribu
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal crear votación */}
        {showCreatePoll && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    Nueva Votación de Logo
                  </h2>
                  <button
                    onClick={() => setShowCreatePoll(false)}
                    className="p-2 hover:bg-gray-800 rounded-full"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Título de la votación
                  </label>
                  <input
                    type="text"
                    value={pollTitle}
                    onChange={(e) => setPollTitle(e.target.value)}
                    placeholder="¿Cuál será nuestro logo oficial?"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={pollDescription}
                    onChange={(e) => setPollDescription(e.target.value)}
                    placeholder="Agrega más contexto sobre la votación..."
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Opciones (mínimo 2) - Sube una imagen para cada diseño
                  </label>
                  <div className="space-y-4">
                    {pollOptions.map((option, idx) => (
                      <div key={idx} className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                        <div className="flex gap-3 items-start">
                          {/* Preview de imagen */}
                          <div className="w-24 h-24 flex-shrink-0 bg-gray-700 rounded-lg overflow-hidden border-2 border-dashed border-gray-600 flex items-center justify-center">
                            {option.uploading ? (
                              <Loader2 size={24} className="animate-spin text-purple-400" />
                            ) : option.imageUrl ? (
                              <Image
                                src={option.imageUrl}
                                alt={option.title || `Opción ${idx + 1}`}
                                width={96}
                                height={96}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon size={24} className="text-gray-500" />
                            )}
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={option.title}
                              onChange={(e) => {
                                const updated = [...pollOptions];
                                updated[idx].title = e.target.value;
                                setPollOptions(updated);
                              }}
                              placeholder={`Nombre del diseño ${idx + 1}`}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm"
                            />
                            
                            <div className="flex gap-2">
                              {/* Botón subir imagen */}
                              <label className="flex-1 cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) uploadOptionImage(idx, file);
                                  }}
                                  disabled={option.uploading}
                                />
                                <div className={`w-full px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors ${
                                  option.uploading 
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                                }`}>
                                  <Upload size={16} />
                                  {option.imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
                                </div>
                              </label>
                              
                              {/* Eliminar opción */}
                              {pollOptions.length > 2 && (
                                <button
                                  onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                                >
                                  <X size={18} />
                                </button>
                              )}
                            </div>
                            
                            {/* O usar URL */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">o usa URL:</span>
                              <input
                                type="url"
                                value={option.imageUrl}
                                onChange={(e) => {
                                  const updated = [...pollOptions];
                                  updated[idx].imageUrl = e.target.value;
                                  setPollOptions(updated);
                                }}
                                placeholder="https://..."
                                className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setPollOptions([...pollOptions, { title: '', imageUrl: '' }])}
                      className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Agregar opción
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-800 flex gap-3">
                <button
                  onClick={createPoll}
                  disabled={submitting}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creando...' : 'Crear Votación'}
                </button>
                <button
                  onClick={() => setShowCreatePoll(false)}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal selector de talla para playeras */}
        {showSizeSelector && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl max-w-md w-full border border-gray-700">
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Shirt size={24} className="text-pink-400" />
                    Selecciona tu talla de playera
                  </h2>
                  <button
                    onClick={() => {
                      setShowSizeSelector(false);
                      setSelectedSize('');
                      setVotingOptionId(null);
                      setCurrentVotingPollId(null);
                    }}
                    className="p-2 hover:bg-gray-800 rounded-full"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  Al votar por el logo, también registras tu talla para la playera de la tribu.
                </p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {SHIRT_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`py-3 px-4 rounded-xl font-bold text-lg transition-all ${
                        selectedSize === size
                          ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                
                {selectedSize && (
                  <div className="text-center text-gray-400 text-sm mb-4">
                    Talla seleccionada: <span className="text-white font-bold">{selectedSize}</span>
                  </div>
                )}
                
                <button
                  onClick={confirmVoteWithSize}
                  disabled={!selectedSize || submitting}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Registrando voto...
                    </>
                  ) : (
                    <>
                      <Vote size={18} />
                      Confirmar voto con talla {selectedSize}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal generación de logos con AI */}
        {showAIGenerator && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles size={24} className="text-pink-400" />
                    Generar Logos con AI
                  </h2>
                  <button
                    onClick={() => {
                      setShowAIGenerator(false);
                      setGeneratedLogos([]);
                      setSelectedAILogos([]);
                      setAiTribeName('');
                      setAiTribeDescription('');
                    }}
                    className="p-2 hover:bg-gray-800 rounded-full"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  Describe tu tribu y la AI generará 4 opciones de logo. Selecciona 2 para enviar a votación.
                </p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Formulario de generación */}
                {generatedLogos.length === 0 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Nombre de la tribu <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={aiTribeName}
                        onChange={(e) => setAiTribeName(e.target.value)}
                        placeholder="Ej: Los Guerreros del Conocimiento"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Descripción de la tribu (opcional)
                      </label>
                      <textarea
                        value={aiTribeDescription}
                        onChange={(e) => setAiTribeDescription(e.target.value)}
                        placeholder="Describe los valores, misión o características de tu tribu para mejores resultados..."
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 resize-none"
                      />
                    </div>
                    
                    <button
                      onClick={generateLogosWithAI}
                      disabled={generatingLogos || !aiTribeName.trim()}
                      className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {generatingLogos ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Generando 4 opciones de logo...
                        </>
                      ) : (
                        <>
                          <Wand2 size={20} />
                          Generar Logos con AI
                        </>
                      )}
                    </button>
                    
                    {generatingLogos && (
                      <div className="text-center text-gray-400 text-sm">
                        <p>Esto puede tomar hasta 1 minuto...</p>
                        <div className="flex justify-center gap-1 mt-2">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Grid de logos generados */}
                {generatedLogos.length > 0 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-white mb-1">
                        ¡Logos generados exitosamente!
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Selecciona <span className="text-purple-400 font-bold">exactamente 2 logos</span> para enviar a votación
                      </p>
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full">
                        <CheckCircle size={14} className="text-purple-400" />
                        <span className="text-purple-300 text-sm">
                          {selectedAILogos.length}/2 seleccionados
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {generatedLogos.map((logo, idx) => (
                        <div
                          key={idx}
                          onClick={() => toggleAILogoSelection(idx)}
                          className={`relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all transform hover:scale-[1.02] ${
                            selectedAILogos.includes(idx)
                              ? 'border-purple-500 ring-2 ring-purple-500/50'
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          {/* Indicador de selección */}
                          {selectedAILogos.includes(idx) && (
                            <div className="absolute top-2 right-2 z-10 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                              <CheckCircle size={20} className="text-white" />
                            </div>
                          )}
                          
                          {/* Número de orden si está seleccionado */}
                          {selectedAILogos.includes(idx) && (
                            <div className="absolute top-2 left-2 z-10 w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center font-bold text-white">
                              {selectedAILogos.indexOf(idx) + 1}
                            </div>
                          )}
                          
                          <div className="aspect-square relative bg-gray-800">
                            <Image
                              src={logo.imageUrl}
                              alt={logo.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          
                          <div className="p-3 bg-gray-800/50">
                            <p className="font-medium text-white text-center">{logo.title}</p>
                            <p className="text-xs text-gray-500 text-center mt-1">{logo.style}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={createPollFromAILogos}
                        disabled={selectedAILogos.length !== 2 || submitting}
                        className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Creando votación...
                          </>
                        ) : (
                          <>
                            <Vote size={18} />
                            Crear votación con {selectedAILogos.length} logos
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => {
                          setGeneratedLogos([]);
                          setSelectedAILogos([]);
                        }}
                        className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl flex items-center gap-2"
                      >
                        <Wand2 size={18} />
                        Regenerar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal listado de tallas */}
        {showSizesList && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
              <div className="sticky top-0 bg-gray-900 p-6 border-b border-gray-800 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Shirt size={24} className="text-indigo-400" />
                    Listado de Tallas de Playera
                  </h2>
                  <button
                    onClick={() => setShowSizesList(false)}
                    className="p-2 hover:bg-gray-800 rounded-full"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {loadingSizes ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-indigo-400" />
                  </div>
                ) : sizesData ? (
                  <div className="space-y-6">
                    {/* Resumen de tallas */}
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <BarChart3 size={18} className="text-indigo-400" />
                        Resumen - Total: {sizesData.totalMembers} miembros
                      </h3>
                      <div className="grid grid-cols-7 gap-2">
                        {SHIRT_SIZES.map(size => (
                          <div key={size} className="bg-gray-700/50 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-white">
                              {sizesData.summary[size] || 0}
                            </div>
                            <div className="text-xs text-gray-400">{size}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Listado por talla */}
                    <div className="space-y-4">
                      {sizesData.sizes.map(({ size, count, users }) => (
                        <div key={size} className="bg-gray-800/30 rounded-xl border border-gray-700 overflow-hidden">
                          <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 px-4 py-3 flex items-center justify-between">
                            <span className="font-bold text-white text-lg">Talla {size}</span>
                            <span className="bg-indigo-500/30 text-indigo-300 px-3 py-1 rounded-full text-sm font-medium">
                              {count} {count === 1 ? 'persona' : 'personas'}
                            </span>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {users.map(user => (
                                <div key={user.userId} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-2">
                                  <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                                    {user.profileImage ? (
                                      <Image
                                        src={user.profileImage}
                                        alt={user.nombre}
                                        width={32}
                                        height={32}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-bold">
                                        {user.nombre.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-white text-sm truncate">{user.nombre}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}

                      {sizesData.sizes.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <Shirt size={48} className="mx-auto mb-3 opacity-50" />
                          <p>Aún no hay tallas registradas</p>
                          <p className="text-sm">Los miembros registran su talla al votar por el logo</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    Error al cargar las tallas
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal subir logo final */}
        {showUploadFinalLogo && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl max-w-lg w-full border border-gray-700">
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Upload size={24} className="text-emerald-400" />
                    Subir Logo Final
                  </h2>
                  <button
                    onClick={() => {
                      setShowUploadFinalLogo(false);
                      setFinalLogoFile(null);
                      setFinalLogoPreview(null);
                    }}
                    className="p-2 hover:bg-gray-800 rounded-full"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-gray-400 text-sm">
                  Si ya tienen el logo definido y no necesitan votar, sube la imagen final aquí. 
                  Este será el logo oficial de la tribu.
                </p>

                {/* Área de subida */}
                <div className="relative">
                  {finalLogoPreview ? (
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 border-2 border-emerald-500">
                      <Image
                        src={finalLogoPreview}
                        alt="Logo preview"
                        fill
                        className="object-contain p-4"
                      />
                      <button
                        onClick={() => {
                          setFinalLogoFile(null);
                          setFinalLogoPreview(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full"
                      >
                        <X size={16} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-gray-600 hover:border-emerald-500 cursor-pointer transition-colors bg-gray-800/50">
                      <Upload size={48} className="text-gray-500 mb-3" />
                      <span className="text-gray-400 text-sm">Click para seleccionar imagen</span>
                      <span className="text-gray-500 text-xs mt-1">PNG, JPG o SVG</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFinalLogoSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Botón guardar */}
                <button
                  onClick={uploadFinalLogo}
                  disabled={!finalLogoFile || uploadingFinalLogo}
                  className={`w-full py-3 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                    finalLogoFile && !uploadingFinalLogo
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {uploadingFinalLogo ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Guardar como Logo Oficial
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente principal con Suspense
export default function IdentityLabPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    }>
      <IdentityLabContent />
    </Suspense>
  );
}
