'use client';

import { useState, useEffect } from 'react';
import { Crown, Vote, X, ArrowRight, Shield, Clock, Sparkles, Check, Loader2, MessageSquare, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface CaptaincyNotification {
  id: number;
  type: 'CAPTAINCY_NOMINATION';
  title: string;
  message: string;
  roleType: string;
  visionId: number;
  visionName: string;
  assignmentId: number;
  createdAt: string;
}

interface PendingPoll {
  id: number;
  type: 'PENDING_VOTE';
  title: string;
  message: string;
  category: string;
  visionId: number;
  visionName: string;
  optionsCount: number;
  votesCount: number;
  endDate: string | null;
  createdAt: string;
}

interface PollOption {
  id: number;
  title: string;
  description?: string;
  imageUrl?: string;
}

interface PollDetails {
  id: number;
  title: string;
  description?: string;
  category: string;
  status: string;
  quorumPercentage: number;
  showResultsBeforeEnd: boolean;
  endDate: string | null;
  options: PollOption[];
  hasVoted: boolean;
  userVoteOptionId: number | null;
}

interface PollStats {
  tribeMembers: number;
  uniqueVoters: number;
  participationPercentage: number;
  quorumReached: boolean;
}

// Mapeo de roleType a nombres amigables
const roleNames: Record<string, string> = {
  'CONTRIBUTION_BASIC': 'Capitán de Contribución Básicos',
  'CONTRIBUTION_ADVANCED': 'Capitán de Contribución Avanzados',
  'DISCIPLINE': 'Capitán de Disciplina',
  'COMMUNITY_SERVICE': 'Capitán de Comunitaria',
  'IDENTITY': 'Capitán de Identidad',
  'LOGISTICS': 'Capitán de Logística'
};

// Mapeo de categorías de votación
const pollCategoryNames: Record<string, string> = {
  'LOGO': 'Logo de la Tribu',
  'PLAYERA': 'Diseño de Playera',
  'COMUNITARIA': 'Proyecto Comunitario',
  'GENERAL': 'Votación General'
};

export default function TribeNotificationsWidget() {
  const [captaincyNotifications, setCaptaincyNotifications] = useState<CaptaincyNotification[]>([]);
  const [pendingPolls, setPendingPolls] = useState<PendingPoll[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para el modal de votación
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState<PendingPoll | null>(null);
  const [pollDetails, setPollDetails] = useState<PollDetails | null>(null);
  const [pollStats, setPollStats] = useState<PollStats | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/tribe');
      if (!response.ok) return;
      
      const data = await response.json();
      
      if (data.success) {
        setCaptaincyNotifications(data.captaincyNotifications || []);
        setPendingPolls(data.pendingPolls || []);
      }
    } catch (error) {
      console.error('Error al obtener notificaciones de tribu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissCaptaincyNotification = async (id: number) => {
    setDismissedIds(prev => new Set(prev).add(`captaincy-${id}`));
    
    // Marcar como leída en el backend
    try {
      await fetch('/api/notifications/tribe', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });
    } catch (error) {
      console.error('Error al marcar notificación:', error);
    }
  };

  const dismissPoll = (id: number) => {
    // Solo dismiss local (no marcar como leída porque aún debe votar)
    setDismissedIds(prev => new Set(prev).add(`poll-${id}`));
  };

  // Abrir modal de votación y cargar detalles
  const openVoteModal = async (poll: PendingPoll) => {
    setSelectedPoll(poll);
    setShowVoteModal(true);
    setLoadingDetails(true);
    setSelectedOptionId(null);
    setVoteSuccess(false);
    
    try {
      const params = new URLSearchParams({
        pollId: poll.id.toString()
      });
      const response = await fetch(`/api/tribe-polls?${params}`);
      const data = await response.json();
      
      if (response.ok && data.poll) {
        setPollDetails(data.poll);
        setPollStats(data.stats);
      }
    } catch (error) {
      console.error('Error al cargar detalles de votación:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeVoteModal = () => {
    setShowVoteModal(false);
    setSelectedPoll(null);
    setPollDetails(null);
    setPollStats(null);
    setSelectedOptionId(null);
    setVoteSuccess(false);
  };

  const submitVote = async () => {
    if (!selectedOptionId || !selectedPoll) return;
    
    setSubmittingVote(true);
    try {
      const response = await fetch('/api/tribe-polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vote',
          pollId: selectedPoll.id,
          optionId: selectedOptionId
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setVoteSuccess(true);
        // Remover de la lista de pendientes
        setPendingPolls(prev => prev.filter(p => p.id !== selectedPoll.id));
        // Cerrar modal después de 2 segundos
        setTimeout(() => {
          closeVoteModal();
        }, 2000);
      } else {
        alert(data.error || 'Error al enviar voto');
      }
    } catch (error) {
      console.error('Error al votar:', error);
      alert('Error al enviar tu voto');
    } finally {
      setSubmittingVote(false);
    }
  };

  // Filtrar notificaciones dismisseadas
  const visibleCaptaincyNotifications = captaincyNotifications.filter(
    notif => !dismissedIds.has(`captaincy-${notif.id}`)
  );

  const visiblePendingPolls = pendingPolls.filter(
    poll => !dismissedIds.has(`poll-${poll.id}`)
  );

  if (isLoading || (visibleCaptaincyNotifications.length === 0 && visiblePendingPolls.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Notificaciones de Capitanías */}
      {visibleCaptaincyNotifications.map((notification) => (
        <div
          key={`captaincy-${notification.id}`}
          className="border-2 rounded-xl p-5 animate-in fade-in slide-in-from-top-4 duration-500 bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-amber-500/50"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse bg-amber-500/20">
                <Crown className="text-amber-400" size={24} />
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1 flex items-center gap-2 text-amber-300">
                <Sparkles size={18} />
                {notification.title}
              </h3>
              <p className="text-amber-100/80 text-sm mb-1">
                {notification.message}
              </p>
              <p className="text-amber-200/60 text-xs flex items-center gap-1">
                <Shield size={12} />
                {notification.visionName}
              </p>
              
              <div className="mt-4 flex items-center gap-3">
                <Link
                  href="/dashboard/legacy-vision-builder"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold rounded-lg transition-all text-sm"
                >
                  <ArrowRight size={16} />
                  Ver Detalles
                </Link>
              </div>
            </div>
            
            <button
              onClick={() => dismissCaptaincyNotification(notification.id)}
              className="flex-shrink-0 p-1 hover:bg-amber-500/20 rounded-full transition-colors"
              aria-label="Cerrar notificación"
            >
              <X size={20} className="text-amber-400/60" />
            </button>
          </div>
        </div>
      ))}

      {/* Votaciones Pendientes */}
      {visiblePendingPolls.map((poll) => (
        <div
          key={`poll-${poll.id}`}
          className="border-2 rounded-xl p-5 animate-in fade-in slide-in-from-top-4 duration-500 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-purple-500/50"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse bg-purple-500/20">
                <Vote className="text-purple-400" size={24} />
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1 flex items-center gap-2 text-purple-300">
                <Sparkles size={18} />
                {poll.title}
              </h3>
              <p className="text-purple-100/80 text-sm mb-1">
                {poll.message}
              </p>
              <div className="flex items-center gap-3 text-xs text-purple-200/60">
                <span className="flex items-center gap-1">
                  <Shield size={12} />
                  {poll.visionName}
                </span>
                <span className="px-2 py-0.5 bg-purple-500/20 rounded-full">
                  {pollCategoryNames[poll.category] || poll.category}
                </span>
                {poll.endDate && (
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Clock size={12} />
                    Termina: {new Date(poll.endDate).toLocaleDateString('es-MX', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                )}
              </div>
              
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => openVoteModal(poll)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold rounded-lg transition-all text-sm"
                >
                  <Vote size={16} />
                  Votar Ahora
                </button>
                <span className="text-xs text-purple-300/60">
                  {poll.optionsCount} opciones • {poll.votesCount} votos
                </span>
              </div>
            </div>
            
            <button
              onClick={() => dismissPoll(poll.id)}
              className="flex-shrink-0 p-1 hover:bg-purple-500/20 rounded-full transition-colors"
              aria-label="Cerrar notificación"
            >
              <X size={20} className="text-purple-400/60" />
            </button>
          </div>
        </div>
      ))}

      {/* Modal de Votación */}
      {showVoteModal && selectedPoll && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30">
            {/* Header del modal */}
            <div className="sticky top-0 bg-gray-900 p-6 border-b border-purple-500/30 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-purple-400 text-sm mb-1">
                  <Vote size={16} />
                  {pollCategoryNames[selectedPoll.category] || selectedPoll.category}
                </div>
                <h2 className="text-xl font-bold text-white">
                  {pollDetails?.title || selectedPoll.message}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedPoll.visionName}
                </p>
              </div>
              <button
                onClick={closeVoteModal}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6">
              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 size={40} className="text-purple-500 animate-spin mb-4" />
                  <p className="text-gray-400">Cargando opciones...</p>
                </div>
              ) : voteSuccess ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                    <Check size={40} className="text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-green-400 mb-2">¡Voto Registrado!</h3>
                  <p className="text-gray-400">Gracias por participar en esta votación</p>
                </div>
              ) : pollDetails ? (
                <>
                  {/* Descripción si existe */}
                  {pollDetails.description && (
                    <p className="text-gray-300 mb-6">{pollDetails.description}</p>
                  )}

                  {/* Stats */}
                  {pollStats && (
                    <div className="flex items-center gap-4 mb-6 p-3 bg-purple-500/10 rounded-lg">
                      <div className="flex items-center gap-2 text-purple-300">
                        <Users size={16} />
                        <span className="text-sm">{pollStats.uniqueVoters} de {pollStats.tribeMembers} han votado</span>
                      </div>
                      <div className="flex-1 h-2 bg-purple-900/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all"
                          style={{ width: `${pollStats.participationPercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-purple-300">{pollStats.participationPercentage}%</span>
                    </div>
                  )}

                  {/* Opciones */}
                  <div className="space-y-3">
                    <p className="text-sm text-gray-400 mb-3">Selecciona tu opción:</p>
                    {pollDetails.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedOptionId(option.id)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          selectedOptionId === option.id
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-gray-700 hover:border-purple-500/50 hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {option.imageUrl && (
                            <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-800">
                              <Image
                                src={option.imageUrl}
                                alt={option.title}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedOptionId === option.id
                                  ? 'border-purple-500 bg-purple-500'
                                  : 'border-gray-600'
                              }`}>
                                {selectedOptionId === option.id && (
                                  <Check size={12} className="text-white" />
                                )}
                              </div>
                              <span className="font-semibold text-white">{option.title}</span>
                            </div>
                            {option.description && (
                              <p className="text-sm text-gray-400 mt-1 ml-7">{option.description}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Fecha límite */}
                  {selectedPoll.endDate && (
                    <div className="mt-6 flex items-center gap-2 text-yellow-400 text-sm">
                      <Clock size={16} />
                      <span>
                        Fecha límite: {new Date(selectedPoll.endDate).toLocaleDateString('es-MX', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Error al cargar los detalles de la votación
                </div>
              )}
            </div>

            {/* Footer con botón de votar */}
            {!loadingDetails && !voteSuccess && pollDetails && (
              <div className="sticky bottom-0 bg-gray-900 p-6 border-t border-purple-500/30">
                <button
                  onClick={submitVote}
                  disabled={!selectedOptionId || submittingVote}
                  className={`w-full py-3 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                    selectedOptionId && !submittingVote
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {submittingVote ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Enviando voto...
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      Confirmar Voto
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-gray-500 mt-3">
                  Tu voto es anónimo y no podrás cambiarlo después
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
