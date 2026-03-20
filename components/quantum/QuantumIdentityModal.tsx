'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Zap, Shield, Brain, Target, CheckCircle, 
  Loader2, Share2, Twitter, Facebook, Linkedin, Copy, X, Camera, Upload
} from 'lucide-react';
import SelfieAvatarCapture from './SelfieAvatarCapture';
import PhotoCaptureOptions from './PhotoCaptureOptions';

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
  brandColor?: string; // Color corporativo de la organización
}

export default function QuantumIdentityModal({ 
  isOpen, 
  onClose, 
  userName, 
  userLevel,
  userRank,
  skipReload = false,
  brandColor = '#6366F1'
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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [vaultSaveStatus, setVaultSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showPhotoCaptureOptions, setShowPhotoCaptureOptions] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [captureMode, setCaptureMode] = useState<'ai-selfie' | 'ai-upload' | 'no-ai' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Función para limpiar el cooldown cuando el avatar se guarda exitosamente
  const clearCooldown = () => {
    localStorage.removeItem('quantum_identity_cooldown');
    console.log('✅ Cooldown limpiado - avatar guardado exitosamente');
  };

  // Resetear el modal cuando se abre para regenerar
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 Modal abierto - reseteando estados...');
      setStage('gender');
      setGender(null);
      setCandidates([]);
      setSelectedCandidate(null);
      setAvatarUrl('');
      setIdentityId(null);
      setErrorMessage('');
      setErrorTitle('Error');
      setIsGenerating(false);
      setShowSelfieCapture(false);
      setUseSelfieMode(false);
      setShowPhotoCaptureOptions(false);
      setCapturedPhotos([]);
      setCaptureMode(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && stage === 'analyzing' && !isGenerating && gender) {
      generateIdentityOptions();
    }
  }, [isOpen, stage, gender]);

  const handleAvatarFromSelfie = (avatarUrl: string) => {
    setAvatarUrl(avatarUrl);
    setShowSelfieCapture(false);
    setShowPhotoCaptureOptions(false);
    setStage('reveal');
    // Limpiar cooldown ya que el avatar se guardó exitosamente
    clearCooldown();
  };

  // Manejar fotos del nuevo componente PhotoCaptureOptions
  const handlePhotosReady = async (photos: string[], mode: 'ai-selfie' | 'ai-upload' | 'no-ai') => {
    setCapturedPhotos(photos);
    setCaptureMode(mode);
    setShowPhotoCaptureOptions(false);

    if (mode === 'no-ai') {
      // Modo sin IA: subir foto directamente como perfil
      setStage('generating');
      try {
        console.log('📷 Iniciando subida de foto sin IA...');
        console.log('  - Photo length:', photos[0]?.length || 0);
        
        // Convertir base64 a blob
        const response = await fetch(photos[0]);
        const blob = await response.blob();
        console.log('  - Blob size:', blob.size, 'type:', blob.type);
        
        const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'profile-upload');

        console.log('📤 Enviando a /api/upload/profile-image...');
        const uploadRes = await fetch('/api/upload/profile-image', {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({ error: 'Error desconocido' }));
          console.error('❌ Error en upload:', uploadRes.status, errorData);
          throw new Error(errorData.error || `Error ${uploadRes.status} al subir imagen`);
        }

        const { url: uploadedUrl } = await uploadRes.json();
        console.log('✅ Imagen subida:', uploadedUrl);

        // Actualizar perfil
        const profileRes = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileImage: uploadedUrl })
        });
        
        if (!profileRes.ok) {
          console.warn('⚠️ Error actualizando perfil, pero la imagen se subió');
        }

        setAvatarUrl(uploadedUrl);
        setStage('reveal');
        clearCooldown();
      } catch (error: any) {
        console.error('Error uploading photo:', error);
        setErrorTitle('Error al subir foto');
        setErrorMessage(error.message || 'No se pudo subir la fotografía');
        setStage('error');
      }
    } else {
      // Modo con IA: generar avatar con múltiples fotos
      setStage('generating');
      try {
        console.log('🤖 Iniciando generación con IA...');
        console.log('  - Número de fotos:', photos.length);
        console.log('  - Gender:', gender);
        console.log('  - Designation:', selectedCandidate?.designation);
        
        const res = await fetch('/api/avatar/generate-from-selfie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: photos, // Enviar array de fotos
            image: photos[0], // Mantener compatibilidad con imagen única
            gender: gender,
            designation: selectedCandidate?.designation,
            archetype: selectedCandidate?.archetype,
            visualTags: selectedCandidate?.visual_tags,
            identityId: identityId,
            selectedOptionId: selectedCandidate?.id
          })
        });

        console.log('📥 Respuesta:', res.status);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }));
          console.error('❌ Error del servidor:', errorData);
          throw new Error(errorData.error || errorData.message || `Error ${res.status} generando avatar`);
        }

        const data = await res.json();
        console.log('✅ Avatar generado:', data.avatarUrl?.substring(0, 50) + '...');
        
        if (!data.avatarUrl) {
          throw new Error('No se recibió URL del avatar');
        }

        setAvatarUrl(data.avatarUrl);
        clearCooldown();
        setStage('reveal');
      } catch (error: any) {
        console.error('Error generando avatar:', error);
        setErrorTitle('Error generando avatar');
        setErrorMessage(error.message || 'No se pudo generar el avatar con IA');
        setStage('error');
      }
    }
  };

  // Manejar subida de foto desde archivo (legacy)
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setErrorTitle('Archivo no válido');
      setErrorMessage('Por favor selecciona una imagen (JPG, PNG, etc.)');
      setStage('error');
      return;
    }

    // Validar tamaño (máximo 5MB - límite de Supabase)
    if (file.size > 5 * 1024 * 1024) {
      setErrorTitle('Archivo muy grande');
      setErrorMessage('La imagen no debe superar los 5MB');
      setStage('error');
      return;
    }

    setIsUploadingPhoto(true);
    setStage('generating'); // Mostrar estado de carga

    try {
      // Crear FormData para subir la imagen
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'profile-upload');

      // Subir a Supabase via API
      const uploadRes = await fetch('/api/upload/profile-image', {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json().catch(() => ({ error: 'Error al subir imagen' }));
        throw new Error(error.error || 'Error al subir imagen');
      }

      const { url: uploadedUrl } = await uploadRes.json();

      // Actualizar el perfil del usuario con la nueva imagen
      const updateRes = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileImage: uploadedUrl })
      });

      if (!updateRes.ok) {
        throw new Error('Error al actualizar perfil');
      }

      // Guardar en vault como backup también
      await fetch('/api/avatars/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarUrl: uploadedUrl,
          vibe: 'uploaded-photo',
          gender: gender || 'neutral',
          sourceImage: 'manual-upload'
        })
      });

      setAvatarUrl(uploadedUrl);
      setStage('reveal');
      clearCooldown();
      
    } catch (error) {
      console.error('Error uploading photo:', error);
      setErrorTitle('Error al subir foto');
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo subir la fotografía');
      setStage('error');
    } finally {
      setIsUploadingPhoto(false);
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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

    // Siempre abrir el modal de opciones de captura de fotos
    setShowPhotoCaptureOptions(true);
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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      
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

          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <button
              onClick={() => {
                setGender('male');
              }}
              className={`group relative h-32 sm:h-40 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
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
              <div className="relative h-full flex items-center justify-start px-6 space-x-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-blue-500/50 border-2 sm:border-4 border-slate-900/50 group-hover:scale-110 transition-transform flex-shrink-0">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">Hombre</p>
              </div>
            </button>

            <button
              onClick={() => {
                setGender('female');
              }}
              className={`group relative h-32 sm:h-40 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
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
              <div className="relative h-full flex items-center justify-start px-6 space-x-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-2xl shadow-pink-500/50 border-2 sm:border-4 border-slate-900/50 group-hover:scale-110 transition-transform flex-shrink-0">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">Mujer</p>
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
                  ✓ Género: <span className="font-bold capitalize">{gender === 'male' ? 'Hombre' : 'Mujer'}</span>
                </p>
              </div>

              {/* Input oculto para subir foto */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              {/* Un solo botón que abre las opciones de captura */}
              <button
                onClick={() => {
                  setUseSelfieMode(true);
                  setStage('analyzing');
                }}
                className="w-full group relative px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-purple-500/30"
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center gap-3">
                    <Camera size={28} className="group-hover:rotate-12 transition-transform" />
                    <Sparkles size={24} className="text-yellow-300 animate-pulse" />
                  </div>
                  <span className="text-lg sm:text-xl font-black uppercase tracking-wide">Continuar</span>
                  <span className="text-xs sm:text-sm text-purple-200 leading-tight text-center">
                    Elegirás cómo crear tu avatar en el siguiente paso
                  </span>
                </div>
              </button>
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

      {/* Modal de Selfie Capture (Legacy - se mantiene por compatibilidad) */}
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

      {/* NUEVO: Modal de Opciones de Captura de Fotos */}
      {showPhotoCaptureOptions && gender && selectedCandidate && (
        <PhotoCaptureOptions
          isOpen={showPhotoCaptureOptions}
          onClose={() => setShowPhotoCaptureOptions(false)}
          gender={gender}
          onPhotosReady={handlePhotosReady}
          selectedDesignation={selectedCandidate}
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
          <p className="text-slate-400">El Consejo está evaluando tu alineacion...</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}

      {/* STAGE 2: SELECTION */}
      {stage === 'selection' && (
        <div className="max-w-6xl w-full space-y-6 sm:space-y-8 bg-slate-900/80 backdrop-blur-xl p-4 sm:p-6 md:p-8 rounded-3xl border-2 border-purple-500/30 max-h-[95vh] overflow-y-auto">
          
          {/* Header */}
          <div className="text-center space-y-3 sm:space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 uppercase tracking-wider leading-tight">
              ROLES DEL CONSEJO DISPONIBLES
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-300 px-4">
              El Consejo Quantum Matter ha identificado 3 roles compatibles con tu perfil.
            </p>
            <p className="text-sm sm:text-base md:text-lg text-purple-400 font-semibold">
              Selecciona tu Posición en el Consejo.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {candidates.map((candidate) => (
              <button
                key={candidate.id}
                onClick={() => handleSelectCandidate(candidate)}
                onMouseEnter={() => setHoveredCard(candidate.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`
                  relative p-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 transform
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

                <div className="relative z-10 space-y-3 sm:space-y-4">
                  {/* Icon */}
                  <div className="flex justify-center">
                    {getArchetypeIcon(candidate.archetype)}
                  </div>

                  {/* Designation */}
                  <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white uppercase tracking-wider sm:tracking-widest text-center leading-tight">
                    {candidate.designation}
                  </h3>

                  {/* Rationale */}
                  <p className="text-xs sm:text-sm text-slate-300 text-center leading-relaxed">
                    {candidate.rationale}
                  </p>

                  {/* Archetype Badge */}
                  <div className="flex justify-center">
                    <span className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getArchetypeGradient(candidate.archetype)} text-white`}>
                      {candidate.archetype}
                    </span>
                  </div>

                  {/* Selection Indicator */}
                  {selectedCandidate?.id === candidate.id && (
                    <div className="flex justify-center">
                      <CheckCircle className="text-green-400 animate-pulse" size={28} />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Confirm Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={confirmSelection}
              disabled={!selectedCandidate}
              className={`
                w-full sm:w-auto px-6 sm:px-8 py-3 rounded-lg font-black uppercase tracking-wide sm:tracking-wider transition-all text-sm sm:text-base
                ${selectedCandidate
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/50'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }
              `}
            >
              <span className="hidden sm:inline">Confirmar Rol en el Consejo</span>
              <span className="sm:hidden">Confirmar Rol</span>
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
        <div className="max-w-sm w-full space-y-4 text-center bg-slate-900/90 backdrop-blur-xl p-5 rounded-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
          
          {/* Avatar compacto */}
          <div className="relative">
            <div 
              className="absolute inset-0 blur-2xl opacity-40 rounded-full"
              style={{ backgroundColor: brandColor }}
            ></div>
            <img
              src={avatarUrl}
              alt="Avatar"
              className="relative z-10 w-32 h-32 mx-auto rounded-full border-2 shadow-xl"
              style={{ borderColor: brandColor }}
            />
          </div>

          {/* Confirmación simple */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-bold text-lg">Avatar creado</span>
            </div>
          </div>

          {/* Botones con color corporativo */}
          <div className="space-y-3 pt-2">
            <button
              onClick={async () => {
                if (vaultSaveStatus === 'saving') return;
                setVaultSaveStatus('saving');
                try {
                  const res = await fetch('/api/avatars/vault', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      avatarUrl: avatarUrl,
                      vibe: 'quantum-identity',
                      gender: gender || 'neutral',
                      sourceImage: 'selfie-generated',
                      designation: selectedCandidate?.designation,
                      archetype: selectedCandidate?.archetype
                    })
                  });
                  if (res.ok) {
                    setVaultSaveStatus('success');
                    setTimeout(() => setVaultSaveStatus('idle'), 3000);
                  } else {
                    setVaultSaveStatus('error');
                    setTimeout(() => setVaultSaveStatus('idle'), 3000);
                  }
                } catch (error) {
                  console.error('Error guardando en vault:', error);
                  setVaultSaveStatus('error');
                  setTimeout(() => setVaultSaveStatus('idle'), 3000);
                }
              }}
              disabled={vaultSaveStatus === 'saving' || vaultSaveStatus === 'success'}
              className={`w-full px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
                vaultSaveStatus === 'success' 
                  ? 'bg-green-600 cursor-default text-white'
                  : vaultSaveStatus === 'error'
                  ? 'bg-red-600 text-white'
                  : vaultSaveStatus === 'saving'
                  ? 'opacity-70 cursor-wait text-white'
                  : 'hover:opacity-90 text-white'
              }`}
              style={vaultSaveStatus !== 'success' && vaultSaveStatus !== 'error' ? { backgroundColor: brandColor } : undefined}
            >
              {vaultSaveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : vaultSaveStatus === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  ¡Guardado!
                </>
              ) : vaultSaveStatus === 'error' ? (
                <>
                  <X className="w-4 h-4" />
                  Error
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Guardar en The Vault
                </>
              )}
            </button>

            <button
              onClick={() => {
                setStage('gender');
                setAvatarUrl('');
                setVaultSaveStatus('idle');
                setCapturedPhotos([]);
                setCaptureMode(null);
                setShowPhotoCaptureOptions(false);
                setShowSelfieCapture(false);
                setUseSelfieMode(false);
              }}
              className="w-full px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm bg-slate-700 hover:bg-slate-600 text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerar
            </button>

            <button
              onClick={() => {
                onClose();
                if (!skipReload) {
                  window.location.reload();
                }
              }}
              className="w-full px-4 py-2 rounded-xl font-medium transition-all text-sm text-slate-400 hover:text-white"
            >
              Cerrar
            </button>
          </div>
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
