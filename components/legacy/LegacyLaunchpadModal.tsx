'use client';

import { useState, useEffect } from 'react';
import {
  Rocket,
  Sparkles,
  Image as ImageIcon,
  Check,
  X,
  Loader2,
  DollarSign,
  Users,
  Clock,
  Target,
  Wand2,
  Eye,
  ChevronRight,
  ChevronLeft,
  Copy,
  ExternalLink,
  Share2,
} from 'lucide-react';

interface LaunchpadProject {
  id: number;
  name: string;
  description: string;
  category: string;
  estimatedBudget?: number;
  contactName?: string;
}

interface ParsedData {
  title: string;
  description: string;
  story: string;
  activity: string;
  beneficiaries: string;
  beneficiariesCount: number;
  duration: string;
  totalBudget: number;
  budgetBreakdown: Array<{ item: string; amount: number; percentage: number }>;
  category: string;
  keywords: string[];
  imagePrompt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  project: LaunchpadProject;
  visionId: number;
  visionName: string;
  tribeLogoUrl?: string;
}

type Step = 'analyze' | 'review' | 'image' | 'launch' | 'success';

export default function LegacyLaunchpadModal({
  isOpen,
  onClose,
  project,
  visionId,
  visionName,
  tribeLogoUrl,
}: Props) {
  const [currentStep, setCurrentStep] = useState<Step>('analyze');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  
  // Datos del proyecto
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [launchedUrl, setLaunchedUrl] = useState<string>('');
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [quotaInfo, setQuotaInfo] = useState<{ quotaPerParticipant: number; participantCount: number } | null>(null);
  
  // Editable fields
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedStory, setEditedStory] = useState('');
  const [editedBudget, setEditedBudget] = useState<number>(0);
  const [editedBreakdown, setEditedBreakdown] = useState<Array<{ item: string; amount: number }>>([]);

  // Cargar número de participantes al abrir
  useEffect(() => {
    if (isOpen && visionId) {
      fetch(`/api/tribe/vision-participants?visionId=${visionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.count) setParticipantCount(data.count);
        })
        .catch(() => {});
    }
  }, [isOpen, visionId]);

  // Calcular cuota cuando cambia el presupuesto o participantes
  useEffect(() => {
    if (participantCount > 0 && editedBudget > 0) {
      setQuotaInfo({
        participantCount,
        quotaPerParticipant: Math.ceil(editedBudget / participantCount),
      });
    }
  }, [participantCount, editedBudget]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('analyze');
      setParsedData(null);
      setGeneratedImage('');
      setLaunchedUrl('');
      setQuotaInfo(null);
      // Start analysis automatically
      analyzeProject();
    }
  }, [isOpen]);

  const analyzeProject = async () => {
    setIsAnalyzing(true);
    try {
      const projectText = `
Nombre: ${project.name}
Descripción: ${project.description}
Categoría: ${project.category}
Presupuesto Estimado: $${project.estimatedBudget?.toLocaleString() || 'Por definir'}
Contacto: ${project.contactName || 'Por definir'}
      `.trim();

      const res = await fetch('/api/legacy-launchpad/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: projectText, projectId: project.id }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        setParsedData(data.data);
        setEditedTitle(data.data.title);
        setEditedDescription(data.data.description);
        setEditedStory(data.data.story);
        setEditedBudget(data.data.totalBudget || project.estimatedBudget || 0);
        setEditedBreakdown(data.data.budgetBreakdown || []);
        setCurrentStep('review');
      } else {
        // Fallback si falla el parsing
        setParsedData({
          title: project.name,
          description: project.description,
          story: project.description,
          activity: 'Proyecto comunitario',
          beneficiaries: 'Comunidad local',
          beneficiariesCount: 100,
          duration: '1 mes',
          totalBudget: project.estimatedBudget || 50000,
          budgetBreakdown: [{ item: 'Gastos generales', amount: project.estimatedBudget || 50000, percentage: 100 }],
          category: project.category,
          keywords: ['comunidad', 'impacto'],
          imagePrompt: `A community service project about ${project.name}, volunteers helping, bright daylight, hopeful atmosphere`,
        });
        setEditedTitle(project.name);
        setEditedDescription(project.description);
        setEditedStory(project.description);
        setEditedBudget(project.estimatedBudget || 50000);
        setEditedBreakdown([{ item: 'Gastos generales', amount: project.estimatedBudget || 50000 }]);
        setCurrentStep('review');
      }
    } catch (error) {
      console.error('Error analyzing:', error);
      alert('Error al analizar el proyecto');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateImage = async () => {
    if (!parsedData) return;
    
    setIsGeneratingImage(true);
    try {
      const res = await fetch('/api/legacy-launchpad/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: parsedData.imagePrompt,
          logoUrl: tribeLogoUrl,
          projectTitle: editedTitle,
        }),
      });

      const data = await res.json();

      if (data.success && data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setCurrentStep('launch');
      } else {
        alert(data.error || 'Error al generar imagen');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Error al generar imagen');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const launchProject = async () => {
    setIsLaunching(true);
    try {
      const res = await fetch('/api/legacy-launchpad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'launch',
          visionId,
          communityProjectId: project.id,
          title: editedTitle,
          description: editedDescription,
          story: editedStory,
          goalAmount: editedBudget,
          budgetBreakdown: editedBreakdown,
          beneficiaries: parsedData?.beneficiaries,
          beneficiariesCount: parsedData?.beneficiariesCount,
          duration: parsedData?.duration,
          activity: parsedData?.activity,
          category: parsedData?.category || project.category,
          coverImageBase64: generatedImage.startsWith('data:') ? generatedImage : undefined,
          coverImageUrl: !generatedImage.startsWith('data:') ? generatedImage : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setLaunchedUrl(data.campaign.publicUrl);
        // Guardar info de cuotas si viene en la respuesta
        if (data.quotas) {
          setQuotaInfo({
            participantCount: data.quotas.participantCount,
            quotaPerParticipant: data.quotas.quotaPerParticipant,
          });
        }
        setCurrentStep('success');
      } else {
        alert(data.error || 'Error al lanzar proyecto');
      }
    } catch (error) {
      console.error('Error launching:', error);
      alert('Error al lanzar proyecto');
    } finally {
      setIsLaunching(false);
    }
  };

  const copyUrl = () => {
    const fullUrl = window.location.origin + launchedUrl;
    navigator.clipboard.writeText(fullUrl);
  };

  const shareWhatsApp = () => {
    const fullUrl = window.location.origin + launchedUrl;
    const text = `🚀 ¡Lanzamos un nuevo proyecto de impacto social!\n\n*${editedTitle}*\n\n${editedDescription}\n\n💰 Meta: $${editedBudget.toLocaleString()} MXN\n\n¡Apoya con lo que puedas! 👇\n${fullUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-2xl border border-purple-500/30 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-500/10">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-900/50 to-indigo-900/50 px-6 py-4 border-b border-purple-500/20 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Legacy Launchpad</h2>
              <p className="text-purple-300 text-sm">Lanzar proyecto al mundo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            {[
              { id: 'analyze', label: 'Analizar', icon: Sparkles },
              { id: 'review', label: 'Revisar', icon: Eye },
              { id: 'image', label: 'Imagen', icon: ImageIcon },
              { id: 'launch', label: 'Lanzar', icon: Rocket },
            ].map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isPast = ['analyze', 'review', 'image', 'launch'].indexOf(currentStep) > idx;
              const isSuccess = currentStep === 'success';
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-2 ${
                    isActive ? 'text-purple-400' : 
                    isPast || isSuccess ? 'text-emerald-400' : 'text-gray-500'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-purple-500/20 ring-2 ring-purple-500' :
                      isPast || isSuccess ? 'bg-emerald-500/20' : 'bg-gray-800'
                    }`}>
                      {isPast || isSuccess ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span className="hidden sm:inline text-sm font-medium">{step.label}</span>
                  </div>
                  {idx < 3 && (
                    <div className={`w-8 sm:w-16 h-0.5 mx-2 ${
                      isPast || isSuccess ? 'bg-emerald-500' : 'bg-gray-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* STEP: ANALYZE */}
          {currentStep === 'analyze' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wand2 className="w-10 h-10 text-purple-400 animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Analizando tu Proyecto</h3>
              <p className="text-gray-400 mb-6">
                La IA está procesando la información para crear una presentación atractiva...
              </p>
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
            </div>
          )}

          {/* STEP: REVIEW */}
          {currentStep === 'review' && parsedData && (
            <div className="space-y-6">
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                <p className="text-purple-300 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  La IA analizó tu proyecto. Revisa y edita lo que necesites.
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Título del Proyecto *</label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-lg font-bold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Descripción Corta</label>
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white resize-none"
                />
              </div>

              {/* Story */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Historia Emotiva (para la página)</label>
                <textarea
                  value={editedStory}
                  onChange={(e) => setEditedStory(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white resize-none"
                />
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <Users className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Beneficiarios</p>
                  <p className="text-white font-bold">{parsedData.beneficiaries}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <Clock className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Duración</p>
                  <p className="text-white font-bold">{parsedData.duration}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <Target className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Actividad</p>
                  <p className="text-white font-bold text-xs">{parsedData.activity}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Meta</p>
                  <p className="text-white font-bold">${editedBudget.toLocaleString()}</p>
                </div>
              </div>

              {/* Budget Breakdown */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Desglose Presupuestal
                </label>
                <div className="space-y-2">
                  {editedBreakdown.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={item.item}
                        onChange={(e) => {
                          const newBreakdown = [...editedBreakdown];
                          newBreakdown[idx].item = e.target.value;
                          setEditedBreakdown(newBreakdown);
                        }}
                        placeholder="Concepto"
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                      />
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => {
                          const newBreakdown = [...editedBreakdown];
                          newBreakdown[idx].amount = parseFloat(e.target.value) || 0;
                          setEditedBreakdown(newBreakdown);
                          // Update total
                          const total = newBreakdown.reduce((sum, i) => sum + i.amount, 0);
                          setEditedBudget(total);
                        }}
                        placeholder="Monto"
                        className="w-28 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                      />
                      <button
                        onClick={() => {
                          const newBreakdown = editedBreakdown.filter((_, i) => i !== idx);
                          setEditedBreakdown(newBreakdown);
                          const total = newBreakdown.reduce((sum, i) => sum + i.amount, 0);
                          setEditedBudget(total);
                        }}
                        className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setEditedBreakdown([...editedBreakdown, { item: '', amount: 0 }])}
                    className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm"
                  >
                    + Agregar concepto
                  </button>
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={() => setCurrentStep('image')}
                disabled={!editedTitle.trim()}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Continuar a Imagen
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* STEP: IMAGE */}
          {currentStep === 'image' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Generar Portada con IA</h3>
                <p className="text-gray-400">
                  DALL-E creará una imagen única para tu proyecto
                  {tribeLogoUrl && ' con el logo de tu tribu'}
                </p>
              </div>

              {/* Preview of prompt */}
              {parsedData && (
                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-2">Prompt de IA:</p>
                  <p className="text-gray-300 text-sm italic">{parsedData.imagePrompt}</p>
                </div>
              )}

              {/* Generated Image Preview */}
              {generatedImage && (
                <div className="rounded-xl overflow-hidden border border-purple-500/30">
                  <img src={generatedImage} alt="Generated cover" className="w-full" />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('review')}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Volver
                </button>
                <button
                  onClick={generateImage}
                  disabled={isGeneratingImage}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generando...
                    </>
                  ) : generatedImage ? (
                    <>
                      <Wand2 className="w-5 h-5" />
                      Regenerar
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      Generar Imagen
                    </>
                  )}
                </button>
              </div>

              {/* Skip option */}
              {!generatedImage && (
                <button
                  onClick={() => setCurrentStep('launch')}
                  className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Saltar y usar imagen por defecto
                </button>
              )}
            </div>
          )}

          {/* STEP: LAUNCH */}
          {currentStep === 'launch' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Rocket className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">¡Listo para Lanzar!</h3>
                <p className="text-gray-400">
                  Tu proyecto será publicado y se crearán cuotas automáticas para los participantes
                </p>
              </div>

              {/* Preview Card */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden border border-gray-700">
                {generatedImage && (
                  <img src={generatedImage} alt="Cover" className="w-full h-48 object-cover" />
                )}
                <div className="p-4">
                  <h4 className="text-lg font-bold text-white mb-2">{editedTitle}</h4>
                  <p className="text-gray-400 text-sm line-clamp-2">{editedDescription}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                    <span className="text-emerald-400 font-bold">${editedBudget.toLocaleString()} MXN</span>
                    <span className="text-gray-500 text-sm">{visionName}</span>
                  </div>
                </div>
              </div>

              {/* Cuotas Info */}
              {quotaInfo && quotaInfo.participantCount > 0 && (
                <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-4 border border-cyan-500/30">
                  <h4 className="text-cyan-300 font-medium mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    División del Presupuesto
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-white/50 text-sm">Presupuesto Total</p>
                      <p className="text-white font-bold text-lg">${editedBudget.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-sm">Participantes</p>
                      <p className="text-white font-bold text-lg">{quotaInfo.participantCount}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-sm">Cuota por persona</p>
                      <p className="text-cyan-400 font-bold text-lg">${quotaInfo.quotaPerParticipant.toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-white/60 text-sm mt-3 text-center">
                    Se crearán {quotaInfo.participantCount} cuotas pendientes que el tesorero marcará como pagadas
                  </p>
                </div>
              )}

              {participantCount === 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <p className="text-yellow-400 text-sm text-center">
                    ⚠️ No se encontraron participantes en esta visión. Las cuotas no se crearán automáticamente.
                  </p>
                </div>
              )}

              {/* Launch Button */}
              <button
                onClick={launchProject}
                disabled={isLaunching}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-lg"
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Lanzando...
                  </>
                ) : (
                  <>
                    <Rocket className="w-6 h-6" />
                    🚀 ¡LANZAR PROYECTO!
                  </>
                )}
              </button>

              <button
                onClick={() => setCurrentStep('image')}
                className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
              >
                ← Volver a editar imagen
              </button>
            </div>
          )}

          {/* STEP: SUCCESS */}
          {currentStep === 'success' && (
            <div className="text-center py-8">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <Check className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-3">¡Proyecto Lanzado! 🎉</h3>
              <p className="text-gray-400 mb-4">
                Tu página de donaciones está lista para compartir con el mundo
              </p>

              {/* Cuotas Creadas */}
              {quotaInfo && quotaInfo.participantCount > 0 && (
                <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-4 border border-cyan-500/30 mb-6 text-left">
                  <h4 className="text-cyan-300 font-medium mb-2 flex items-center gap-2 justify-center">
                    <Users className="w-5 h-5" />
                    ✅ Cuotas Creadas Automáticamente
                  </h4>
                  <p className="text-white/70 text-sm text-center">
                    Se crearon <span className="text-cyan-400 font-bold">{quotaInfo.participantCount} cuotas</span> de{' '}
                    <span className="text-cyan-400 font-bold">${quotaInfo.quotaPerParticipant.toLocaleString()} MXN</span> cada una
                  </p>
                  <p className="text-white/50 text-xs text-center mt-2">
                    El tesorero podrá marcar cada cuota como pagada en la sección de Ingresos
                  </p>
                </div>
              )}

              {/* URL Box */}
              <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 mb-6">
                <input
                  type="text"
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}${launchedUrl}`}
                  readOnly
                  className="flex-1 bg-transparent text-white text-sm outline-none"
                />
                <button
                  onClick={copyUrl}
                  className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <a
                  href={launchedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>

              {/* Share Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={shareWhatsApp}
                  className="flex-1 py-3 bg-[#25D366] hover:bg-[#22c55e] text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  Compartir en WhatsApp
                </button>
                <a
                  href={launchedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  Ver Página
                </a>
              </div>

              <button
                onClick={onClose}
                className="w-full mt-6 py-3 text-gray-400 hover:text-white transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
