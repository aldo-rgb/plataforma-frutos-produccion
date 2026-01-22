'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Camera,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  Image as ImageIcon,
  Music,
  FileText,
  Search,
  X,
  Upload,
  Save,
  Sparkles
} from 'lucide-react';

interface Participante {
  id: number;
  nombreCompleto: string;
  fotoPerfilUrl: string | null;
  email: string;
  telefono: string | null;
  captureStatus: 'PENDING' | 'PARTIAL' | 'COMPLETE' | null;
  captureId: number | null;
  hasPhotoWithGC: boolean;
  hasPhotoWithSquad: boolean;
  hasPhotoBlueWall: boolean;
  hasLullaby: boolean;
  hasContract: boolean;
  hasDeclaration: boolean;
}

interface Vision {
  visionId: number;
  visionNombre: string;
  school: string;
  organization: string;
  product: string;
  trainingLevel: 'BASIC' | 'ADVANCED' | 'PL';
  fechaInicio: string;
  fechaFin: string;
  status: string;
  totalParticipantes: number;
  capturaCompleta: number;
  capturaParcial: number;
  sinCaptura: number;
  participantes: Participante[];
  requiredFields: string[];
}

interface LegacyData {
  gcId: number;
  gcName: string;
  visiones: Vision[];
}

interface CaptureForm {
  visionId: number;
  participantId: number;
  participantName: string;
  trainingLevel: 'BASIC' | 'ADVANCED' | 'PL';
  // Campos
  photoWithGCUrl: string;
  photoWithSquadUrl: string;
  photoBlueWallUrl: string;
  lullabyTitle: string;
  lullabyArtist: string;
  contractPhotoUrl: string;
  contractDeclaration: string;
}

export default function LegacyCapturePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<LegacyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVision, setSelectedVision] = useState<Vision | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [captureForm, setCaptureForm] = useState<CaptureForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchLegacyData();
    }
  }, [session]);

  const fetchLegacyData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/legacy-capture');
      const result = await res.json();

      if (res.ok) {
        setData(result);
        if (result.visiones?.length > 0) {
          setSelectedVision(result.visiones[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching legacy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string
  ) => {
    const file = e.target.files?.[0];
    if (!file || !captureForm) return;

    setUploading(field);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'legacy');
      formData.append('participantId', captureForm.participantId.toString());
      formData.append('photoType', field.replace('Url', '').replace('photo', '').toLowerCase());

      const res = await fetch('/api/quantum-album/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (res.ok) {
        setCaptureForm({
          ...captureForm,
          [field]: result.photoUrl,
        });
      } else {
        alert(result.error || 'Error al subir imagen');
      }
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Error al subir la imagen');
    } finally {
      setUploading(null);
    }
  };

  const openCaptureModal = (participante: Participante, vision: Vision) => {
    setCaptureForm({
      visionId: vision.visionId,
      participantId: participante.id,
      participantName: participante.nombreCompleto,
      trainingLevel: vision.trainingLevel,
      photoWithGCUrl: '',
      photoWithSquadUrl: '',
      photoBlueWallUrl: '',
      lullabyTitle: '',
      lullabyArtist: '',
      contractPhotoUrl: '',
      contractDeclaration: '',
    });
    setShowCaptureModal(true);
  };

  const saveCapture = async () => {
    if (!captureForm) return;

    setSaving(true);
    try {
      const res = await fetch('/api/legacy-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(captureForm),
      });

      const result = await res.json();

      if (res.ok) {
        setShowCaptureModal(false);
        setCaptureForm(null);
        fetchLegacyData(); // Refresh
        alert(result.message);
      } else {
        alert(result.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar la captura');
    } finally {
      setSaving(false);
    }
  };

  const filteredParticipantes = selectedVision?.participantes.filter((p) =>
    p.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!data || data.visiones.length === 0) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-100 mb-2">
              Sin entrenamientos activos
            </h2>
            <p className="text-gray-400">
              No tienes entrenamientos activos asignados para capturar legados.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Camera className="w-8 h-8" />
          <h1 className="text-2xl font-bold">Legacy Capture</h1>
        </div>
        <p className="text-purple-200">
          Captura los momentos especiales del último día de entrenamiento
        </p>
      </div>

      {/* Selector de Visión */}
      {data.visiones.length > 1 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Selecciona el entrenamiento:
          </label>
          <div className="flex flex-wrap gap-2">
            {data.visiones.map((v) => (
              <button
                key={v.visionId}
                onClick={() => setSelectedVision(v)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedVision?.visionId === v.visionId
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {v.visionNombre}
                <span className="ml-2 opacity-70">
                  ({v.capturaCompleta}/{v.totalParticipantes})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats del entrenamiento seleccionado */}
      {selectedVision && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-100">
              {selectedVision.totalParticipantes}
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Completos</span>
            </div>
            <p className="text-2xl font-bold text-green-400">
              {selectedVision.capturaCompleta}
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Parciales</span>
            </div>
            <p className="text-2xl font-bold text-yellow-400">
              {selectedVision.capturaParcial}
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Pendientes</span>
            </div>
            <p className="text-2xl font-bold text-red-400">
              {selectedVision.sinCaptura}
            </p>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar participante..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Lista de participantes */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-gray-800/50">
          <h3 className="font-semibold text-gray-100">
            Participantes ({filteredParticipantes.length})
          </h3>
          {selectedVision?.trainingLevel !== 'BASIC' && (
            <p className="text-sm text-purple-400 mt-1">
              ✨ Entrenamiento {selectedVision?.trainingLevel} - Incluye canción de cuna y contrato
            </p>
          )}
        </div>

        <div className="divide-y divide-gray-800">
          {filteredParticipantes.map((p) => (
            <div
              key={p.id}
              className="p-4 hover:bg-gray-800/50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  {p.fotoPerfilUrl ? (
                    <img
                      src={p.fotoPerfilUrl}
                      alt={p.nombreCompleto}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-purple-900 flex items-center justify-center">
                      <span className="text-purple-300 font-medium">
                        {p.nombreCompleto.charAt(0)}
                      </span>
                    </div>
                  )}
                  {/* Status indicator */}
                  <div
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-gray-900 flex items-center justify-center ${
                      p.captureStatus === 'COMPLETE'
                        ? 'bg-green-500'
                        : p.captureStatus === 'PARTIAL'
                        ? 'bg-yellow-500'
                        : 'bg-gray-600'
                    }`}
                  >
                    {p.captureStatus === 'COMPLETE' ? (
                      <CheckCircle className="w-3 h-3 text-white" />
                    ) : p.captureStatus === 'PARTIAL' ? (
                      <Clock className="w-3 h-3 text-white" />
                    ) : (
                      <Camera className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>

                <div>
                  <p className="font-medium text-gray-100">{p.nombreCompleto}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {/* Mini indicators */}
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        p.hasPhotoWithGC
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-gray-800 text-gray-500'
                      }`}
                    >
                      <Camera className="w-3 h-3 inline mr-1" />
                      GC
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        p.hasPhotoWithSquad
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-gray-800 text-gray-500'
                      }`}
                    >
                      <Users className="w-3 h-3 inline mr-1" />
                      Squad
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        p.hasPhotoBlueWall
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-gray-800 text-gray-500'
                      }`}
                    >
                      <ImageIcon className="w-3 h-3 inline mr-1" />
                      Wall
                    </span>
                    {selectedVision?.trainingLevel !== 'BASIC' && (
                      <>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            p.hasLullaby
                              ? 'bg-green-900/50 text-green-400'
                              : 'bg-gray-800 text-gray-500'
                          }`}
                        >
                          <Music className="w-3 h-3 inline mr-1" />
                          🎵
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            p.hasContract
                              ? 'bg-green-900/50 text-green-400'
                              : 'bg-gray-800 text-gray-500'
                          }`}
                        >
                          <FileText className="w-3 h-3 inline mr-1" />
                          📜
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => openCaptureModal(p, selectedVision!)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {p.captureStatus ? 'Editar' : 'Capturar'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}

          {filteredParticipantes.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No se encontraron participantes
            </div>
          )}
        </div>
      </div>

      {/* Modal de Captura */}
      {showCaptureModal && captureForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-gray-100">
                  Captura de Legado
                </h3>
                <p className="text-sm text-gray-400">
                  {captureForm.participantName}
                </p>
              </div>
              <button
                onClick={() => setShowCaptureModal(false)}
                className="p-2 hover:bg-gray-800 rounded-full text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Foto con GC */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  📸 Foto con el GC
                </label>
                <div className="flex items-center gap-4">
                  {captureForm.photoWithGCUrl ? (
                    <img
                      src={captureForm.photoWithGCUrl}
                      alt="Con GC"
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-800 rounded-lg flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'photoWithGCUrl')}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-900/20 transition-colors">
                      {uploading === 'photoWithGCUrl' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                      ) : (
                        <Upload className="w-5 h-5 text-gray-500" />
                      )}
                      <span className="text-sm text-gray-400">
                        {captureForm.photoWithGCUrl ? 'Cambiar' : 'Subir foto'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Foto con Squad */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  👥 Foto con el Squad
                </label>
                <div className="flex items-center gap-4">
                  {captureForm.photoWithSquadUrl ? (
                    <img
                      src={captureForm.photoWithSquadUrl}
                      alt="Con Squad"
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-800 rounded-lg flex items-center justify-center">
                      <Users className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'photoWithSquadUrl')}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-900/20 transition-colors">
                      {uploading === 'photoWithSquadUrl' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                      ) : (
                        <Upload className="w-5 h-5 text-gray-500" />
                      )}
                      <span className="text-sm text-gray-400">
                        {captureForm.photoWithSquadUrl ? 'Cambiar' : 'Subir foto'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Foto Pared Azul */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  🟦 Foto en la Pared Azul
                </label>
                <div className="flex items-center gap-4">
                  {captureForm.photoBlueWallUrl ? (
                    <img
                      src={captureForm.photoBlueWallUrl}
                      alt="Pared Azul"
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-blue-900/50 rounded-lg flex items-center justify-center">
                      <div className="w-8 h-8 bg-blue-500 rounded" />
                    </div>
                  )}
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'photoBlueWallUrl')}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-900/20 transition-colors">
                      {uploading === 'photoBlueWallUrl' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                      ) : (
                        <Upload className="w-5 h-5 text-gray-500" />
                      )}
                      <span className="text-sm text-gray-400">
                        {captureForm.photoBlueWallUrl ? 'Cambiar' : 'Subir foto'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Campos adicionales para ADVANCED/PL */}
              {captureForm.trainingLevel !== 'BASIC' && (
                <>
                  <hr className="my-4 border-gray-800" />
                  <div className="bg-purple-900/30 border border-purple-800 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 text-purple-400 mb-2">
                      <Sparkles className="w-5 h-5" />
                      <span className="font-medium">Contenido Avanzado</span>
                    </div>
                    <p className="text-sm text-purple-300">
                      Estos campos son exclusivos para entrenamientos avanzados
                    </p>
                  </div>

                  {/* Canción de Cuna */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-300">
                      🎵 Canción de Cuna
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Título de la canción"
                        value={captureForm.lullabyTitle}
                        onChange={(e) =>
                          setCaptureForm({
                            ...captureForm,
                            lullabyTitle: e.target.value,
                          })
                        }
                        className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        type="text"
                        placeholder="Artista"
                        value={captureForm.lullabyArtist}
                        onChange={(e) =>
                          setCaptureForm({
                            ...captureForm,
                            lullabyArtist: e.target.value,
                          })
                        }
                        className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Foto del Contrato */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      📜 Foto del Contrato Firmado
                    </label>
                    <div className="flex items-center gap-4">
                      {captureForm.contractPhotoUrl ? (
                        <img
                          src={captureForm.contractPhotoUrl}
                          alt="Contrato"
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-yellow-900/30 rounded-lg flex items-center justify-center">
                          <FileText className="w-8 h-8 text-yellow-500" />
                        </div>
                      )}
                      <label className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'contractPhotoUrl')}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-900/20 transition-colors">
                          {uploading === 'contractPhotoUrl' ? (
                            <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                          ) : (
                            <Upload className="w-5 h-5 text-gray-500" />
                          )}
                          <span className="text-sm text-gray-400">
                            {captureForm.contractPhotoUrl ? 'Cambiar' : 'Subir foto'}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Declaración */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      ✨ Declaración del Participante
                    </label>
                    <textarea
                      placeholder="Escribe la declaración que el participante quiere mostrar en su dashboard..."
                      value={captureForm.contractDeclaration}
                      onChange={(e) =>
                        setCaptureForm({
                          ...captureForm,
                          contractDeclaration: e.target.value,
                        })
                      }
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                    <p className="text-xs text-gray-500">
                      Esta declaración aparecerá en el dashboard del participante
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer Modal */}
            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-4 flex justify-end gap-3">
              <button
                onClick={() => setShowCaptureModal(false)}
                className="px-4 py-2 text-gray-400 hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveCapture}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Guardar Captura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
