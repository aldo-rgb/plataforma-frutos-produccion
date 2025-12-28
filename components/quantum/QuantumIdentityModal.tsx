'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Zap, Shield, Brain, Target, CheckCircle, 
  Loader2, Share2, Twitter, Facebook, Linkedin, Copy, X
} from 'lucide-react';

interface Candidate {
  id: string;
  designation: string;
  rationale: string;
  visual_tags: string[];
  archetype: 'CEREBRAL' | 'PHYSICAL' | 'LEADER';
}

interface QuantumIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userLevel: number;
  userRank: string;
}

export default function QuantumIdentityModal({ 
  isOpen, 
  onClose, 
  userName, 
  userLevel,
  userRank 
}: QuantumIdentityModalProps) {
  const [stage, setStage] = useState<'analyzing' | 'selection' | 'generating' | 'reveal'>('analyzing');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [identityId, setIdentityId] = useState<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    if (isOpen && stage === 'analyzing') {
      generateIdentityOptions();
    }
  }, [isOpen]);

  const generateIdentityOptions = async () => {
    try {
      const res = await fetch('/api/quantum-identity', {
        method: 'POST'
      });

      if (!res.ok) {
        const error = await res.json();
        if (error.requiresCarta) {
          alert('Necesitas tener tu carta autorizada primero');
          onClose();
          return;
        }
        if (error.hasImage) {
          alert('Ya tienes una identidad cuántica asignada');
          onClose();
          return;
        }
        throw new Error('Error generando opciones');
      }

      const data = await res.json();
      setCandidates(data.candidates);
      setIdentityId(data.identityId);

      // Transición a selección después de la animación
      setTimeout(() => {
        setStage('selection');
      }, 3000);

    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar identidad cuántica');
      onClose();
    }
  };

  const handleSelectCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const confirmSelection = async () => {
    if (!selectedCandidate || !identityId) return;

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

      if (!res.ok) throw new Error('Error generando avatar');

      const data = await res.json();
      setAvatarUrl(data.avatarUrl);

      // Transición a reveal
      setTimeout(() => {
        setStage('reveal');
      }, 3000);

    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar avatar');
      setStage('selection');
    }
  };

  const getArchetypeIcon = (archetype: string) => {
    switch (archetype) {
      case 'CEREBRAL': return <Brain className="text-blue-400" size={40} />;
      case 'PHYSICAL': return <Zap className="text-green-400" size={40} />;
      case 'LEADER': return <Shield className="text-yellow-400" size={40} />;
      default: return <Target className="text-purple-400" size={40} />;
    }
  };

  const getArchetypeGradient = (archetype: string) => {
    switch (archetype) {
      case 'CEREBRAL': return 'from-blue-600 to-cyan-600';
      case 'PHYSICAL': return 'from-green-600 to-emerald-600';
      case 'LEADER': return 'from-yellow-600 to-orange-600';
      default: return 'from-purple-600 to-pink-600';
    }
  };

  const shareToTwitter = () => {
    const text = `🚀 Mi designación cuántica: ${selectedCandidate?.designation}\n\n${selectedCandidate?.rationale}\n\n#QuantumMatter #Frutos`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  const shareToLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  const copyToClipboard = () => {
    const text = `Mi designación cuántica: ${selectedCandidate?.designation}\n${selectedCandidate?.rationale}`;
    navigator.clipboard.writeText(text);
    alert('¡Copiado al portapapeles!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      
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
            CALCULANDO RUTAS DE EVOLUCIÓN...
          </h2>
          <p className="text-slate-400">Analizando tus metas y objetivos...</p>
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
              RUTAS DE IDENTIDAD DETECTADAS
            </h2>
            <p className="text-xl text-slate-300">
              El sistema ha encontrado 3 caminos compatibles con tus ambiciones.
            </p>
            <p className="text-lg text-purple-400 font-semibold">
              Elige tu Designación Operativa.
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
                    ? `border-${candidate.archetype === 'CEREBRAL' ? 'blue' : candidate.archetype === 'PHYSICAL' ? 'green' : 'yellow'}-500 bg-gradient-to-br ${getArchetypeGradient(candidate.archetype)}/20 scale-105 shadow-2xl`
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
              Confirmar Identidad
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
            COMPILANDO IDENTIDAD...
          </h2>
          <p className="text-xl text-purple-400">
            {selectedCandidate?.designation}
          </p>
          <p className="text-slate-400">Generando tu avatar cuántico...</p>
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
              IDENTIDAD CONFIRMADA
            </h2>
            <p className="text-3xl font-bold text-white uppercase tracking-widest">
              BIENVENIDO, {selectedCandidate?.designation}
            </p>
            <p className="text-slate-400 text-lg">
              {selectedCandidate?.rationale}
            </p>
          </div>

          {/* Share Section */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <Share2 size={20} />
              Comparte tu Identidad Cuántica
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
              onClose();
              window.location.reload(); // Recargar para mostrar el nuevo avatar
            }}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-black uppercase tracking-wider transition-all shadow-lg shadow-purple-500/50"
          >
            Continuar
          </button>
        </div>
      )}

    </div>
  );
}
