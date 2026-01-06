'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Zap, Shield, Brain, Target, CheckCircle, 
  Loader2, Share2, Twitter, Facebook, Linkedin, Copy, X, Camera
} from 'lucide-react';
import SelfieAvatarCapture from './SelfieAvatarCapture';

interface Candidate {
  id: string;
  designation: string;
  rationale: string;
  visual_tags: string[];
  archetype: 'DIRECTOR' | 'ARCHITECT' | 'CURATOR' | 'MODELER' | 'OVERSEER' | 'STRATEGIST' | 'ENGINEER' | 'ANALYST' | 'ARCHIVIST' | 'SENTINEL' | 'OBSERVER' | 'INTERFACE';
}

interface QuantumIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userLevel: number;
  userRank: string;
  skipReload?: boolean; // Si es true, no recarga la página al cerrar
}

export default function QuantumIdentityModal({ 
  isOpen, 
  onClose, 
  userName, 
  userLevel,
  userRank,
  skipReload = false
}: QuantumIdentityModalProps) {
  const [stage, setStage] = useState<'gender' | 'analyzing' | 'selection' | 'generating' | 'reveal' | 'error'>('gender');
  const [gender, setGender] = useState<'male' | 'female' | 'neutral' | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [identityId, setIdentityId] = useState<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorTitle, setErrorTitle] = useState<string>('Error');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSelfieCapture, setShowSelfieCapture] = useState(false);
  const [useSelfieMode, setUseSelfieMode] = useState(false);

  // Funci\u00f3n para limpiar el cooldown cuando el avatar se guarda exitosamente
  const clearCooldown = () => {
    localStorage.removeItem('quantum_identity_cooldown');
    console.log('\u2705 Cooldown limpiado - avatar guardado exitosamente');
  };

  useEffect(() => {
    if (isOpen && stage === 'analyzing' && !isGenerating && gender) {
      generateIdentityOptions();
    }
  }, [isOpen, stage, gender]);

  const handleAvatarFromSelfie = (avatarUrl: string) => {
    setAvatarUrl(avatarUrl);
    setShowSelfieCapture(false);
    setStage('reveal');
    // Limpiar cooldown ya que el avatar se guardó exitosamente
    clearCooldown();
  };

  const generateIdentityOptions = async () => {
    if (isGenerating || !gender) return;
    
    setIsGenerating(true);
    try {
      const res = await fetch('/api/quantum-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender })
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Error desconocido' }));
        
        if (error.requiresCarta) {
          setErrorTitle('CARTA NO CREADA');
          setErrorMessage('Necesitas crear tu Carta F.R.U.T.O.S. antes de generar tu Avatar Cuántico. La carta puede estar en cualquier estado (borrador, en revisión, etc.).');
          setStage('error');
          setIsGenerating(false);
          
          // Redirigir a crear carta después de 3 segundos si cierran el modal
          setTimeout(() => {
            onClose();
            window.location.href = '/dashboard/carta';
          }, 3000);
          return;
        }
        
        // Mostrar el mensaje de error específico del servidor
        setErrorTitle('Error al generar identidad cuántica');
        setErrorMessage(error.details || error.error || 'No se pudo generar la identidad. Verifica que tengas una carta autorizada.');
        setStage('error');
        setIsGenerating(false);
        return;
      }

      const data = await res.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No se generaron candidatos de identidad');
      }
      
      setCandidates(data.candidates);
      setIdentityId(data.identityId);

      // Transición a selección después de la animación
      setTimeout(() => {
        setStage('selection');
        setIsGenerating(false);
      }, 3000);

    } catch (error: any) {
      console.error('Error generando identidad:', error);
      setErrorTitle('Error al generar identidad cuántica');
      setErrorMessage(error.message || 'No se pudo conectar con el sistema. Verifica tu conexión a internet y que tengas una carta autorizada.');
      setStage('error');
      setIsGenerating(false);
    }
  };

  const handleSelectCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const confirmSelection = async () => {
    if (!selectedCandidate || !identityId) return;

    // Si es modo selfie, abrir la cámara en lugar de generar con IA
    if (useSelfieMode) {
      setShowSelfieCapture(true);
      return;
    }

    // Modo IA: generar avatar automáticamente
    setStage('generating');

    try {
      const res = await fetch('/api/quantum-identity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityId,
          selectedOptionId: selectedCandidate.id
        })
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(error.error || 'Error generando avatar');
      }

      const data = await res.json();
      
      // Verificar que tenemos un avatar URL válido
      if (!data.avatarUrl) {
        throw new Error('No se recibió URL del avatar');
      }
      
      setAvatarUrl(data.avatarUrl);
      
      // Limpiar cooldown ya que el avatar se guardó exitosamente
      clearCooldown();

      // Transición a reveal
      setTimeout(() => {
        setStage('reveal');
      }, 3000);

    } catch (error: any) {
      console.error('Error generando avatar:', error);
      setErrorTitle('Error al generar avatar');
      setErrorMessage('No se pudo generar tu avatar. Por favor intenta de nuevo o contacta al soporte si el problema persiste.');
      setStage('error');
    }
  };

  const getArchetypeIcon = (archetype: string) => {
    switch (archetype) {
      case 'DIRECTOR': return <Shield className="text-purple-400" size={40} />;
      case 'ARCHITECT': return <Target className="text-blue-400" size={40} />;
      case 'CURATOR': return <Brain className="text-cyan-400" size={40} />;
      case 'MODELER': return <Sparkles className="text-indigo-400" size={40} />;
      case 'OVERSEER': return <Shield className="text-gray-400" size={40} />;
      case 'STRATEGIST': return <Target className="text-amber-400" size={40} />;
      case 'ENGINEER': return <Zap className="text-teal-400" size={40} />;
      case 'ANALYST': return <Brain className="text-green-400" size={40} />;
      case 'ARCHIVIST': return <Brain className="text-slate-400" size={40} />;
      case 'SENTINEL': return <Shield className="text-red-400" size={40} />;
      case 'OBSERVER': return <Sparkles className="text-purple-400" size={40} />;
      case 'INTERFACE': return <Target className="text-pink-400" size={40} />;
      default: return <Target className="text-purple-400" size={40} />;
    }
  };

  const getArchetypeGradient = (archetype: string) => {
    switch (archetype) {
      case 'DIRECTOR': return 'from-purple-600 to-indigo-600';
      case 'ARCHITECT': return 'from-blue-600 to-cyan-600';
      case 'CURATOR': return 'from-cyan-600 to-teal-600';
      case 'MODELER': return 'from-indigo-600 to-purple-600';
      case 'OVERSEER': return 'from-gray-600 to-slate-600';
      case 'STRATEGIST': return 'from-amber-600 to-orange-600';
      case 'ENGINEER': return 'from-teal-600 to-emerald-600';
      case 'ANALYST': return 'from-green-600 to-lime-600';
      case 'ARCHIVIST': return 'from-slate-600 to-gray-600';
      case 'SENTINEL': return 'from-red-600 to-rose-600';
      case 'OBSERVER': return 'from-purple-600 to-pink-600';
      case 'INTERFACE': return 'from-pink-600 to-fuchsia-600';
      default: return 'from-purple-600 to-pink-600';
    }
  };

  const shareToTwitter = () => {
    const text = `🏢 Mi rol en el Consejo Quantum Matter: ${selectedCandidate?.designation}\n\n${selectedCandidate?.rationale}\n\n#QuantumMatter #Frutos #ConsejoCuantico`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  const shareToLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  const copyToClipboard = () => {
    const text = `Mi rol en el Consejo Quantum Matter: ${selectedCandidate?.designation}\n${selectedCandidate?.rationale}`;
    navigator.clipboard.writeText(text);
    alert('¡Copiado al portapapeles!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      
      {/* STAGE 0: GENDER SELECTION */}
      {stage === 'gender' && (
        <div className="max-w-2xl w-full space-y-4 sm:space-y-6 bg-slate-900/80 backdrop-blur-xl p-4 sm:p-6 md:p-8 rounded-3xl border-2 border-purple-500/30 max-h-[95vh] overflow-y-auto">
          <div className="text-center space-y-2 sm:space-y-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
              <Sparkles className="text-white" size={24} />
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 uppercase tracking-wider">
              Consejo Quantum Matter
            </h2>
            <p className="text-sm sm:text-base md:text-xl text-slate-300">
              Configuración de tu Perfil Ejecutivo
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <button
              onClick={() => {
                setGender('male');
              }}
              className={`group relative h-48 sm:h-56 md:h-64 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 hover:scale-105 overflow-hidden ${
                gender === 'male' 
                  ? 'border-blue-500 bg-blue-500/20 ring-2 sm:ring-4 ring-blue-500/50' 
                  : 'border-blue-500/30 bg-slate-800/50 hover:bg-blue-500/10 hover:border-blue-500'
              }`}
            >
              {/* Background Image */}
              <div className="absolute inset-0">
                <img 
                  src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=600&h=800&fit=crop&crop=faces" 
                  alt="Male Avatar" 
                  className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
              </div>
              
              {/* Icon Circle */}
              <div className="relative h-full flex flex-col items-center justify-center space-y-2 sm:space-y-3">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-blue-500/50 border-2 sm:border-4 border-slate-900/50 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-lg">Hombre</p>
              </div>
            </button>

            <button
              onClick={() => {
                setGender('female');
              }}
              className={`group relative h-48 sm:h-56 md:h-64 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 hover:scale-105 overflow-hidden ${
                gender === 'female' 
                  ? 'border-pink-500 bg-pink-500/20 ring-2 sm:ring-4 ring-pink-500/50' 
                  : 'border-pink-500/30 bg-slate-800/50 hover:bg-pink-500/10 hover:border-pink-500'
              }`}
            >
              {/* Background Image */}
              <div className="absolute inset-0">
                <img 
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop&crop=faces" 
                  alt="Female Avatar" 
                  className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
              </div>
              
              {/* Icon Circle */}
              <div className="relative h-full flex flex-col items-center justify-center space-y-2 sm:space-y-3">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-2xl shadow-pink-500/50 border-2 sm:border-4 border-slate-900/50 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-lg">Mujer</p>
              </div>
            </button>

            <button
              onClick={() => {
                setGender('neutral');
              }}
              className={`group relative h-48 sm:h-56 md:h-64 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 hover:scale-105 overflow-hidden ${
                gender === 'neutral' 
                  ? 'border-purple-500 bg-purple-500/20 ring-2 sm:ring-4 ring-purple-500/50' 
                  : 'border-purple-500/30 bg-slate-800/50 hover:bg-purple-500/10 hover:border-purple-500'
              }`}
            >
              {/* Cyberpunk Background */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-blue-900/50 to-cyan-900/50"></div>
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
              </div>
              
              {/* Icon Circle */}
              <div className="relative h-full flex flex-col items-center justify-center space-y-2 sm:space-y-3 px-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-purple-500/50 border-2 sm:border-4 border-slate-900/50 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-white drop-shadow-lg text-center leading-tight">Prefiero no contestar</p>
              </div>
            </button>
          </div>

          {/* Mensaje de selección de género */}
          {!gender && (
            <div className="text-center py-2 sm:py-3">
              <p className="text-sm sm:text-base md:text-lg text-yellow-400 animate-pulse">
                ⬆️ Selecciona tu género para continuar
              </p>
            </div>
          )}

          {/* Botones de acción cuando hay género seleccionado */}
          {gender && (
            <div className="space-y-3 sm:space-y-4">
              <div className="text-center">
                <p className="text-green-400 text-sm sm:text-base md:text-lg mb-2 sm:mb-3">
                  ✓ Género: <span className="font-bold capitalize">{gender === 'neutral' ? 'Prefiero no contestar' : gender === 'male' ? 'Hombre' : 'Mujer'}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Botón de Avatar con IA */}
                <button
                  onClick={() => {
                    setUseSelfieMode(false);
                    setStage('analyzing');
                  }}
                  className="group relative px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-purple-500/30"
                >
                  <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                    <Sparkles size={24} className="sm:w-8 sm:h-8 group-hover:rotate-12 transition-transform" />
                    <span className="text-sm sm:text-base md:text-lg leading-tight text-center">Generar Perfil con IA</span>
                    <span className="text-xs sm:text-sm text-purple-200 leading-tight text-center">Retrato corporativo del Consejo</span>
                  </div>
                </button>

                {/* Botón de Selfie */}
                <button
                  onClick={() => {
                    setUseSelfieMode(true);
                    setStage('analyzing');
                  }}
                  className="group relative px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/30"
                >
                  <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                    <Camera size={24} className="sm:w-8 sm:h-8 group-hover:rotate-12 transition-transform" />
                    <span className="text-sm sm:text-base md:text-lg leading-tight text-center">📸 Crear con Selfie</span>
                    <span className="text-xs sm:text-sm text-cyan-200 leading-tight text-center">Avatar personalizado con IA</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Selfie Capture */}
      {showSelfieCapture && gender && selectedCandidate && (
        <SelfieAvatarCapture
          isOpen={showSelfieCapture}
          onClose={() => setShowSelfieCapture(false)}
          gender={gender}
          onAvatarGenerated={handleAvatarFromSelfie}
          selectedDesignation={selectedCandidate}
          identityId={identityId || undefined}
        />
      )}
      
      {/* STAGE 1: ANALYZING */}
      {stage === 'analyzing' && (
        <div className="text-center space-y-6 animate-pulse">
          <div className="relative">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 animate-spin" style={{ animationDuration: '3s' }}>
              <div className="absolute inset-2 bg-slate-950 rounded-full flex items-center justify-center">
                <Sparkles className="text-purple-400" size={48} />
              </div>
            </div>
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider">
            ANALIZANDO PERFIL EJECUTIVO...
          </h2>
          <p className="text-slate-400">El Consejo está evaluando tus capacidades...</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}

      {/* STAGE 2: SELECTION */}
      {stage === 'selection' && (
        <div className="max-w-6xl w-full space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 uppercase tracking-wider">
              ROLES DEL CONSEJO DISPONIBLES
            </h2>
            <p className="text-xl text-slate-300">
              El Consejo Quantum Matter ha identificado 3 roles compatibles con tu perfil.
            </p>
            <p className="text-lg text-purple-400 font-semibold">
              Selecciona tu Posición en el Consejo.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {candidates.map((candidate) => (
              <button
                key={candidate.id}
                onClick={() => handleSelectCandidate(candidate)}
                onMouseEnter={() => setHoveredCard(candidate.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`
                  relative p-6 rounded-2xl border-2 transition-all duration-300 transform
                  ${selectedCandidate?.id === candidate.id
                    ? `border-purple-500 bg-gradient-to-br ${getArchetypeGradient(candidate.archetype)}/20 scale-105 shadow-2xl`
                    : 'border-slate-700 bg-slate-900/50 hover:scale-105 hover:border-slate-500'
                  }
                  ${hoveredCard === candidate.id ? 'shadow-2xl shadow-purple-500/50' : ''}
                `}
              >
                {/* Glow Effect */}
                {(selectedCandidate?.id === candidate.id || hoveredCard === candidate.id) && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${getArchetypeGradient(candidate.archetype)} opacity-20 blur-xl rounded-2xl`}></div>
                )}

                <div className="relative z-10 space-y-4">
                  {/* Icon */}
                  <div className="flex justify-center">
                    {getArchetypeIcon(candidate.archetype)}
                  </div>

                  {/* Designation */}
                  <h3 className="text-2xl font-black text-white uppercase tracking-widest text-center">
                    {candidate.designation}
                  </h3>

                  {/* Rationale */}
                  <p className="text-sm text-slate-300 text-center">
                    {candidate.rationale}
                  </p>

                  {/* Archetype Badge */}
                  <div className="flex justify-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getArchetypeGradient(candidate.archetype)} text-white`}>
                      {candidate.archetype}
                    </span>
                  </div>

                  {/* Selection Indicator */}
                  {selectedCandidate?.id === candidate.id && (
                    <div className="flex justify-center">
                      <CheckCircle className="text-green-400 animate-pulse" size={32} />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Confirm Button */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={confirmSelection}
              disabled={!selectedCandidate}
              className={`
                px-8 py-3 rounded-lg font-black uppercase tracking-wider transition-all
                ${selectedCandidate
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/50'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }
              `}
            >
              Confirmar Rol en el Consejo
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: GENERATING */}
      {stage === 'generating' && (
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-40 h-40 mx-auto rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 animate-spin">
              <div className="absolute inset-2 bg-slate-950 rounded-full flex items-center justify-center">
                <Loader2 className="text-purple-400 animate-spin" size={64} />
              </div>
            </div>
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider">
            GENERANDO PERFIL EJECUTIVO...
          </h2>
          <p className="text-xl text-purple-400">
            {selectedCandidate?.designation}
          </p>
          <p className="text-slate-400">Creando tu retrato corporativo del Consejo...</p>
        </div>
      )}

      {/* STAGE 4: REVEAL */}
      {stage === 'reveal' && (
        <div className="max-w-2xl w-full space-y-8 text-center">
          
          {/* Avatar Reveal */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 blur-3xl opacity-50 animate-pulse"></div>
            <img
              src={avatarUrl}
              alt="Quantum Avatar"
              className="relative z-10 w-64 h-64 mx-auto rounded-full border-4 border-purple-500 shadow-2xl shadow-purple-500/50 animate-in fade-in zoom-in duration-1000"
            />
          </div>

          {/* Identity Confirmed */}
          <div className="space-y-4">
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 uppercase tracking-wider animate-in slide-in-from-bottom duration-500">
              ROL CONFIRMADO
            </h2>
            <p className="text-3xl font-bold text-white uppercase tracking-widest">
              BIENVENIDO AL CONSEJO, {selectedCandidate?.designation}
            </p>
            <p className="text-slate-400 text-lg">
              {selectedCandidate?.rationale}
            </p>
          </div>

          {/* Share Section */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <Share2 size={20} />
              Comparte tu Rol en el Consejo
            </h3>
            
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={shareToTwitter}
                className="p-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-all"
                title="Compartir en Twitter"
              >
                <Twitter size={24} className="text-white" />
              </button>
              <button
                onClick={shareToFacebook}
                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
                title="Compartir en Facebook"
              >
                <Facebook size={24} className="text-white" />
              </button>
              <button
                onClick={shareToLinkedIn}
                className="p-3 bg-blue-700 hover:bg-blue-800 rounded-lg transition-all"
                title="Compartir en LinkedIn"
              >
                <Linkedin size={24} className="text-white" />
              </button>
              <button
                onClick={copyToClipboard}
                className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all"
                title="Copiar al portapapeles"
              >
                <Copy size={24} className="text-white" />
              </button>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => {
              // El cooldown ya fue limpiado cuando se guardó el avatar exitosamente
              // Cerrar modal normalmente - el usuario ya tiene su profileImage en BD
              onClose();
              
              // Solo recargar si no estamos en modo skipReload (ej: dentro del wizard)
              if (!skipReload) {
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              }
            }}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-black uppercase tracking-wider transition-all shadow-lg shadow-purple-500/50"
          >
            Continuar
          </button>
        </div>
      )}

      {/* STAGE ERROR */}
      {stage === 'error' && (
        <div className="max-w-2xl w-full space-y-6">
          <div className="bg-gradient-to-br from-red-900/40 via-slate-900 to-red-900/40 border-2 border-red-500/50 rounded-2xl p-8 shadow-2xl">
            {/* Icon de error */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center">
                  <X className="text-white" size={48} strokeWidth={3} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-800 rounded-full animate-ping opacity-20"></div>
              </div>
            </div>

            {/* T\u00edtulo del error */}
            <h2 className="text-3xl font-black text-center text-white mb-4 uppercase tracking-wider">
              {errorTitle}
            </h2>

            {/* Mensaje del error */}
            <div className="bg-slate-900/50 border border-red-500/30 rounded-xl p-6 mb-6">
              <p className="text-slate-300 text-center leading-relaxed">
                {errorMessage}
              </p>
            </div>

            {/* Detalles t\u00e9cnicos */}
            <div className="bg-slate-950/50 border border-slate-700 rounded-lg p-4 mb-6">
              <p className="text-xs text-slate-500 font-mono text-center">
                Si el problema persiste, contacta a soporte@quantummatter.com
              </p>
            </div>

            {/* Bot\u00f3n de cerrar */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setStage('analyzing');
                  setErrorMessage('');
                  setErrorTitle('Error');
                  setIsGenerating(false);
                  generateIdentityOptions();
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-bold uppercase tracking-wider transition-all shadow-lg"
              >
                Reintentar
              </button>
              <button
                onClick={() => {
                  setStage('analyzing');
                  setErrorMessage('');
                  setErrorTitle('Error');
                  setIsGenerating(false);
                  onClose();
                }}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold uppercase tracking-wider transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
