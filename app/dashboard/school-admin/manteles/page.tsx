'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Printer, Upload, Image as ImageIcon, Check, AlertCircle, 
  Loader2, ChevronDown, Eye, FileDown, Trash2, Edit2, Save,
  ArrowLeft, Settings
} from 'lucide-react';
import Image from 'next/image';

interface Participant {
  id: number;
  odiseoId: number;
  fullName: string;
  firstName: string;
  displayName: string;
  contract: string;
  hasContract: boolean;
  status: 'ready' | 'missing';
}

interface Vision {
  id: number;
  nombre: string;
}

interface AssetConfig {
  orgLogo: string | null;
  backgrounds: (string | null)[];
}

export default function MantelesPage() {
  const router = useRouter();
  
  // Estado general
  const [loading, setLoading] = useState(true);
  const [visiones, setVisiones] = useState<Vision[]>([]);
  const [selectedVision, setSelectedVision] = useState<Vision | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  
  // Assets
  const [assetConfig, setAssetConfig] = useState<AssetConfig>({
    orgLogo: null,
    backgrounds: [null, null, null, null]
  });
  const [visionLogo, setVisionLogo] = useState<string | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);
  
  // Participantes
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ displayName: string; contract: string }>({ displayName: '', contract: '' });
  
  // Generación
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  
  // Cargar visiones activas
  useEffect(() => {
    async function loadData() {
      try {
        // Cargar visiones
        const visionRes = await fetch('/api/coordinador/visiones');
        const visionData = await visionRes.json();
        setVisiones(visionData.visiones || []);
        
        // Cargar assets
        const assetRes = await fetch('/api/school-admin/manteles/assets');
        const assetData = await assetRes.json();
        setAssetConfig(assetData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Cargar participantes cuando se selecciona una visión
  useEffect(() => {
    if (!selectedVision) {
      setParticipants([]);
      return;
    }
    
    async function loadParticipants() {
      setLoadingParticipants(true);
      try {
        const res = await fetch(`/api/school-admin/manteles/participants/${selectedVision!.id}`);
        const data = await res.json();
        setParticipants(data.participants || []);
      } catch (error) {
        console.error('Error loading participants:', error);
      } finally {
        setLoadingParticipants(false);
      }
    }
    loadParticipants();
  }, [selectedVision]);

  // Subir asset (logo org o fondo)
  const handleUploadAsset = async (type: string, file: File) => {
    setUploadingAsset(type);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const res = await fetch('/api/school-admin/manteles/assets', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      if (data.success) {
        setAssetConfig(data.config);
      }
    } catch (error) {
      console.error('Error uploading asset:', error);
    } finally {
      setUploadingAsset(null);
    }
  };

  // Subir logo de visión
  const handleUploadVisionLogo = async (file: File) => {
    if (!selectedVision) return;
    
    setUploadingAsset('visionLogo');
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`/api/school-admin/manteles/vision-logo/${selectedVision.id}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      if (data.success) {
        setVisionLogo(data.logoUrl);
      } else {
        alert('Error al subir logo: ' + (data.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error uploading vision logo:', error);
      alert('Error de conexión al subir el logo');
    } finally {
      setUploadingAsset(null);
    }
  };

  // Guardar edición de participante
  const handleSaveEdit = async (participant: Participant) => {
    try {
      await fetch(`/api/school-admin/manteles/participants/${selectedVision?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          odiseoId: participant.odiseoId,
          contract: editValues.contract,
          displayName: editValues.displayName
        })
      });
      
      // Actualizar localmente
      setParticipants(prev => prev.map(p => 
        p.id === participant.id 
          ? { 
              ...p, 
              displayName: editValues.displayName,
              contract: editValues.contract,
              hasContract: editValues.contract.trim().length > 0,
              status: editValues.contract.trim().length > 0 ? 'ready' : 'missing'
            }
          : p
      ));
      setEditingId(null);
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  // Generar manteles
  const handleGenerate = async (singleTest = false) => {
    if (!selectedVision) return;
    
    const readyParticipants = participants.filter(p => p.hasContract);
    if (readyParticipants.length === 0) {
      alert('No hay participantes con contrato para generar manteles');
      return;
    }
    
    setGenerating(true);
    try {
      const res = await fetch('/api/school-admin/manteles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visionId: selectedVision.id,
          visionLogo,
          participants: singleTest ? [readyParticipants[0]] : readyParticipants,
          singleTest
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setPreviewHtml(data.html);
        
        if (!singleTest) {
          // Abrir en nueva ventana para imprimir
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(data.html);
            printWindow.document.close();
          }
        }
      }
    } catch (error) {
      console.error('Error generating:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  const readyCount = participants.filter(p => p.hasContract).length;
  const missingCount = participants.filter(p => !p.hasContract).length;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Printer className="text-purple-400" />
              Generador de Manteles
            </h1>
            <p className="text-slate-400 mt-1">
              Genera PDFs tamaño tabloide listos para imprenta
            </p>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700"
          >
            <Settings size={18} />
            Configurar Assets
          </button>
        </div>

        {/* Panel de Configuración de Assets */}
        {showConfig && (
          <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4">⚙️ Assets de la Organización</h2>
            <p className="text-slate-400 text-sm mb-6">
              Configura estos assets una sola vez. Se usarán para todos los manteles.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Logo de Organización */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="font-medium mb-2 text-sm">Logo Organización</h3>
                <div className="aspect-square bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                  {assetConfig.orgLogo ? (
                    <Image 
                      src={assetConfig.orgLogo} 
                      alt="Logo Org" 
                      width={120} 
                      height={120}
                      className="object-contain"
                    />
                  ) : (
                    <ImageIcon className="text-slate-600" size={40} />
                  )}
                </div>
                <label className="mt-2 block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUploadAsset('orgLogo', e.target.files[0])}
                  />
                  <span className="flex items-center justify-center gap-1 text-sm bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded cursor-pointer">
                    {uploadingAsset === 'orgLogo' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    Subir
                  </span>
                </label>
              </div>

              {/* 4 Fondos */}
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2 text-sm">Fondo {num}</h3>
                  <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                    {assetConfig.backgrounds[num - 1] ? (
                      <Image 
                        src={assetConfig.backgrounds[num - 1]!} 
                        alt={`Fondo ${num}`} 
                        width={200} 
                        height={120}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <ImageIcon className="text-slate-600" size={30} />
                    )}
                  </div>
                  <label className="mt-2 block">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleUploadAsset(`background${num}`, e.target.files[0])}
                    />
                    <span className="flex items-center justify-center gap-1 text-sm bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded cursor-pointer">
                      {uploadingAsset === `background${num}` ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      Subir
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selector de Visión */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">PASO 1: Selecciona la Visión</h2>
          
          <div className="relative">
            <select
              value={selectedVision?.id || ''}
              onChange={(e) => {
                const vision = visiones.find(v => v.id === parseInt(e.target.value));
                setSelectedVision(vision || null);
                setVisionLogo(null);
                setPreviewHtml(null);
              }}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 appearance-none cursor-pointer"
            >
              <option value="">-- Selecciona una visión --</option>
              {visiones.map((v) => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {selectedVision && (
          <>
            {/* Logo de la Visión */}
            <div className="bg-slate-800 rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">PASO 2: Sube el Logo de la Visión</h2>
              <p className="text-slate-400 text-sm mb-4">
                El logo que los alumnos diseñaron para "{selectedVision.nombre}"
              </p>
              
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
                  {visionLogo ? (
                    <Image src={visionLogo} alt="Logo Visión" width={120} height={120} className="object-contain" />
                  ) : (
                    <ImageIcon className="text-slate-500" size={40} />
                  )}
                </div>
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUploadVisionLogo(e.target.files[0])}
                  />
                  <span className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg cursor-pointer">
                    {uploadingAsset === 'visionLogo' ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    {visionLogo ? 'Cambiar Logo' : 'Subir Logo'}
                  </span>
                </label>
              </div>
            </div>

            {/* Tabla de Participantes */}
            <div className="bg-slate-800 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">PASO 3: Auditoría de Contratos</h2>
                  <p className="text-slate-400 text-sm">
                    Participantes con asistencia PL confirmada
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-green-400">
                    <Check size={16} /> {readyCount} listos
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <AlertCircle size={16} /> {missingCount} faltantes
                  </span>
                </div>
              </div>

              {loadingParticipants ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                </div>
              ) : participants.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  No hay participantes con asistencia PL confirmada
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                        <th className="pb-3 px-2">Participante</th>
                        <th className="pb-3 px-2">Nombre a Mostrar</th>
                        <th className="pb-3 px-2">Contrato</th>
                        <th className="pb-3 px-2 text-center">Estatus</th>
                        <th className="pb-3 px-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((p) => (
                        <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="py-3 px-2 text-sm">{p.fullName}</td>
                          <td className="py-3 px-2">
                            {editingId === p.id ? (
                              <input
                                type="text"
                                value={editValues.displayName}
                                onChange={(e) => setEditValues(prev => ({ ...prev, displayName: e.target.value }))}
                                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm w-full"
                              />
                            ) : (
                              <span className="text-sm font-medium">{p.displayName}</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            {editingId === p.id ? (
                              <input
                                type="text"
                                value={editValues.contract}
                                onChange={(e) => setEditValues(prev => ({ ...prev, contract: e.target.value }))}
                                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm w-full"
                                placeholder="Soy un/una..."
                              />
                            ) : (
                              <span className={`text-sm ${p.hasContract ? 'text-slate-300' : 'text-amber-400 italic'}`}>
                                {p.contract || '[ SIN CONTRATO ]'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {p.hasContract ? (
                              <span className="inline-flex items-center gap-1 text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded">
                                <Check size={12} /> Listo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-400 text-xs bg-amber-400/10 px-2 py-1 rounded">
                                <AlertCircle size={12} /> Falta
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            {editingId === p.id ? (
                              <button
                                onClick={() => handleSaveEdit(p)}
                                className="p-1.5 bg-green-600 hover:bg-green-700 rounded"
                              >
                                <Save size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingId(p.id);
                                  setEditValues({ displayName: p.displayName, contract: p.contract });
                                }}
                                className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Botones de Generación */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">PASO 4: Generar PDF</h2>
              
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => handleGenerate(true)}
                  disabled={generating || readyCount === 0}
                  className="flex items-center gap-2 px-5 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                >
                  {generating ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
                  Vista Previa (1 mantel)
                </button>
                
                <button
                  onClick={() => handleGenerate(false)}
                  disabled={generating || readyCount === 0 || !visionLogo}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium"
                >
                  {generating ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                  GENERAR PDF TABLOIDE ({readyCount} manteles)
                </button>
              </div>

              {!visionLogo && (
                <p className="text-amber-400 text-sm mt-3">
                  ⚠️ Debes subir el logo de la visión antes de generar
                </p>
              )}
              
              {missingCount > 0 && (
                <p className="text-slate-400 text-sm mt-3">
                  💡 Hay {missingCount} participantes sin contrato que no se incluirán en el PDF
                </p>
              )}
            </div>

            {/* Preview */}
            {previewHtml && (
              <div className="mt-6 bg-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Vista Previa</h3>
                <div className="bg-white rounded-lg overflow-hidden" style={{ aspectRatio: '17/11' }}>
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full"
                    style={{ minHeight: '400px' }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
