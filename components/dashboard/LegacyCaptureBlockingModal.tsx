'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Camera, Clock, CheckCircle, Sparkles, Music, FileText, Users, Loader2 } from 'lucide-react';

interface LegacyStatus {
  hasLegacyPending: boolean;
  vision: {
    id: number;
    nombre: string;
    fechaFin: string;
    product: string;
    trainingLevel: 'BASIC' | 'ADVANCED' | 'PL';
  } | null;
  capture: {
    status: 'PENDING' | 'PARTIAL' | 'COMPLETE';
    hasPhotoWithGC: boolean;
    hasPhotoWithSquad: boolean;
    hasPhotoBlueWall: boolean;
    hasLullaby: boolean;
    hasContract: boolean;
    hasDeclaration: boolean;
  } | null;
  gameChanger: {
    id: number;
    nombre: string;
    foto: string | null;
  } | null;
}

export default function LegacyCaptureBlockingModal() {
  const { data: session } = useSession();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<LegacyStatus | null>(null);

  useEffect(() => {
    if (session?.user) {
      checkLegacyStatus();
    }
  }, [session]);

  const checkLegacyStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/legacy-capture/my-status');
      const data = await res.json();

      if (data.success && data.hasLegacyPending && data.capture?.status !== 'COMPLETE') {
        setStatus(data);
        setShow(true);
      } else {
        setShow(false);
      }
    } catch (error) {
      console.error('Error checking legacy status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Polling cada 30 segundos para verificar si el GC completó la captura
  useEffect(() => {
    if (!show) return;

    const interval = setInterval(() => {
      checkLegacyStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [show]);

  if (!show || !status) return null;

  const isAdvanced = status.vision?.trainingLevel !== 'BASIC';
  const capture = status.capture;

  // Determinar campos faltantes
  const missingBasic = [];
  if (!capture?.hasPhotoWithGC) missingBasic.push('Foto con tu GC');
  if (!capture?.hasPhotoWithSquad) missingBasic.push('Foto con tu Squad');
  if (!capture?.hasPhotoBlueWall) missingBasic.push('Foto en la Pared Azul');

  const missingAdvanced = [];
  if (isAdvanced) {
    if (!capture?.hasLullaby) missingAdvanced.push('Canción de Cuna');
    if (!capture?.hasContract) missingAdvanced.push('Foto del Contrato');
    if (!capture?.hasDeclaration) missingAdvanced.push('Tu Declaración');
  }

  const allMissing = [...missingBasic, ...missingAdvanced];
  const completedCount = (isAdvanced ? 6 : 3) - allMissing.length;
  const totalCount = isAdvanced ? 6 : 3;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-purple-900/95 via-indigo-900/95 to-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900/90 border border-purple-500/30 rounded-3xl p-8 shadow-2xl shadow-purple-500/20">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
            <Camera className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            📸 ¡Es hora de tu Legacy Capture!
          </h2>
          <p className="text-purple-300">
            Tu Game Changer está capturando tus momentos especiales del entrenamiento.
          </p>
        </div>

        {/* Entrenamiento Info */}
        {status.vision && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
            <p className="text-sm text-purple-400 mb-1">Entrenamiento</p>
            <p className="text-lg font-bold text-white">{status.vision.nombre}</p>
            <p className="text-sm text-purple-300">{status.vision.product}</p>
          </div>
        )}

        {/* GC Info */}
        {status.gameChanger && (
          <div className="flex items-center gap-3 mb-6 p-3 bg-slate-800/50 rounded-xl">
            {status.gameChanger.foto ? (
              <img
                src={status.gameChanger.foto}
                alt={status.gameChanger.nombre}
                className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-purple-500/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
            )}
            <div>
              <p className="text-sm text-gray-400">Tu Game Changer</p>
              <p className="font-semibold text-white">{status.gameChanger.nombre}</p>
            </div>
          </div>
        )}

        {/* Progreso */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progreso de captura</span>
            <span className="text-purple-400 font-bold">{completedCount}/{totalCount}</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-3 mb-6">
          <p className="text-sm text-gray-400 font-medium">Información requerida:</p>
          
          {/* Fotos básicas */}
          <div className="space-y-2">
            <ChecklistItem
              icon={<Camera className="w-4 h-4" />}
              label="Foto con tu GC"
              completed={capture?.hasPhotoWithGC || false}
            />
            <ChecklistItem
              icon={<Users className="w-4 h-4" />}
              label="Foto con tu Squad"
              completed={capture?.hasPhotoWithSquad || false}
            />
            <ChecklistItem
              icon={<Sparkles className="w-4 h-4" />}
              label="Foto en la Pared Azul"
              completed={capture?.hasPhotoBlueWall || false}
            />
          </div>

          {/* Campos avanzados */}
          {isAdvanced && (
            <>
              <div className="border-t border-slate-700 my-3" />
              <p className="text-xs text-purple-400 font-medium">Contenido Avanzado ✨</p>
              <div className="space-y-2">
                <ChecklistItem
                  icon={<Music className="w-4 h-4" />}
                  label="Canción de Cuna"
                  completed={capture?.hasLullaby || false}
                />
                <ChecklistItem
                  icon={<FileText className="w-4 h-4" />}
                  label="Foto del Contrato"
                  completed={capture?.hasContract || false}
                />
                <ChecklistItem
                  icon={<Sparkles className="w-4 h-4" />}
                  label="Tu Declaración"
                  completed={capture?.hasDeclaration || false}
                />
              </div>
            </>
          )}
        </div>

        {/* Mensaje de espera */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-400 mb-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-semibold">Esperando a tu GC...</span>
          </div>
          <p className="text-sm text-amber-300/80">
            Busca a {status.gameChanger?.nombre || 'tu Game Changer'} para completar tu captura de legado.
            Una vez completada, podrás continuar.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-4">
          Esta pantalla se actualizará automáticamente cuando tu GC complete la captura.
        </p>
      </div>
    </div>
  );
}

function ChecklistItem({
  icon,
  label,
  completed,
}: {
  icon: React.ReactNode;
  label: string;
  completed: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
        completed
          ? 'bg-green-500/10 border border-green-500/30'
          : 'bg-slate-800/50 border border-slate-700'
      }`}
    >
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full ${
          completed ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-gray-400'
        }`}
      >
        {completed ? <CheckCircle className="w-5 h-5" /> : icon}
      </div>
      <span
        className={`text-sm font-medium ${
          completed ? 'text-green-400' : 'text-gray-300'
        }`}
      >
        {label}
      </span>
      {completed && (
        <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />
      )}
    </div>
  );
}
