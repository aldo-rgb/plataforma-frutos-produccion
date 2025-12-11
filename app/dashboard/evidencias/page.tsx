'use client';

import React, { useState } from 'react';
import { 
  UploadCloud, Image as ImageIcon, X, CheckCircle, 
  Loader2, Trophy, Zap, Shield, Target, Scan, ArrowRight
} from 'lucide-react';

const CATEGORIAS = [
  { id: 'finanzas', label: 'Finanzas', color: 'text-emerald-400', border: 'group-hover:border-emerald-500/50', bg: 'group-hover:bg-emerald-500/10' },
  { id: 'relaciones', label: 'Relaciones', color: 'text-rose-400', border: 'group-hover:border-rose-500/50', bg: 'group-hover:bg-rose-500/10' },
  { id: 'talentos', label: 'Talentos', color: 'text-amber-400', border: 'group-hover:border-amber-500/50', bg: 'group-hover:bg-amber-500/10' },
  { id: 'paz', label: 'Paz Mental', color: 'text-sky-400', border: 'group-hover:border-sky-500/50', bg: 'group-hover:bg-sky-500/10' },
  { id: 'ocio', label: 'Diversión', color: 'text-violet-400', border: 'group-hover:border-violet-500/50', bg: 'group-hover:bg-violet-500/10' },
  { id: 'salud', label: 'Salud', color: 'text-red-400', border: 'group-hover:border-red-500/50', bg: 'group-hover:bg-red-500/10' },
  { id: 'trans', label: 'Transformación', color: 'text-yellow-400', border: 'group-hover:border-yellow-500/50', bg: 'group-hover:bg-yellow-500/10' },
  { id: 'comun', label: 'Comunidad', color: 'text-indigo-400', border: 'group-hover:border-indigo-500/50', bg: 'group-hover:bg-indigo-500/10' },
  { id: 'enrol', label: 'Enrolamiento', color: 'text-cyan-400', border: 'group-hover:border-cyan-500/50', bg: 'group-hover:bg-cyan-500/10' },
];

export default function EvidenciasPage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Estado para mostrar los puntos reales ganados
  const [puntosGanados, setPuntosGanados] = useState(0);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setSelectedFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
  };

  // --- FUNCIÓN CONECTADA AL BACKEND ---
  const handleUpload = async () => {
    if (!selectedFile || !selectedCategory) return;
    setUploading(true);

    try {
      // 1. Llamamos a la API real
      const res = await fetch('/api/evidencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoria: selectedCategory,
          fileName: selectedFile.name // Enviamos el nombre para simular
        }),
      });

      const data = await res.json();

      if (data.success) {
        setPuntosGanados(data.nuevosPuntos); // Guardamos el nuevo total para mostrarlo si queremos
        setUploading(false);
        setShowSuccess(true);
        
        // Limpieza después de 3 segundos
        setTimeout(() => {
          setShowSuccess(false);
          setSelectedFile(null);
          setSelectedCategory('');
        }, 3000);
      } else {
        alert("Error al subir evidencia");
        setUploading(false);
      }

    } catch (error) {
      console.error(error);
      setUploading(false);
      alert("Error de conexión");
    }
  };

  return (
    <div className="relative max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* Luces Ambientales */}
      <div className="absolute top-20 left-10 h-64 w-64 bg-cyan-500/10 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 h-64 w-64 bg-blue-600/10 blur-[100px] pointer-events-none rounded-full" />

      {/* HEADER */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
            Centro de <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Materialización</span>
          </h1>
          <p className="mt-2 text-slate-400 font-medium">
            Valida tus acciones en el campo cuántico. <span className="text-cyan-400 font-bold ml-2 inline-flex items-center gap-1"><Zap size={14} fill="currentColor" /> Recompensa: +25 PC</span>
          </p>
        </div>
      </div>

      <div className="relative z-10 grid gap-8 lg:grid-cols-12">
        
        {/* PANEL DE CONTROL (8 COLUMNAS) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* SELECTOR DE MISIÓN */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-2 mb-6">
              <Target className="text-cyan-400" size={20} />
              <label className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                Seleccionar Frecuencia
              </label>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`
                    group relative overflow-hidden rounded-xl border px-4 py-4 text-left transition-all duration-300
                    ${selectedCategory === cat.id 
                      ? 'bg-slate-800 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/50' 
                      : 'bg-slate-950/50 border-white/5 hover:border-white/20'}
                  `}
                >
                  <div className={`absolute inset-0 opacity-0 transition-opacity duration-300 ${cat.bg} ${selectedCategory === cat.id ? 'opacity-100 bg-cyan-500/5' : 'group-hover:opacity-100'}`} />
                  <div className="relative z-10 flex flex-col gap-1">
                    <span className={`text-xs font-black uppercase tracking-wider transition-colors ${selectedCategory === cat.id ? 'text-cyan-400' : cat.color}`}>
                      {cat.label}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {selectedCategory === cat.id ? '● ACTIVO' : 'Seleccionar'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* DROPZONE "PORTAL" */}
          <div 
            className={`
              relative group flex flex-col items-center justify-center w-full h-80 rounded-3xl border-2 border-dashed transition-all duration-500 overflow-hidden
              ${dragActive 
                ? 'border-cyan-400 bg-cyan-900/20 scale-[1.01] shadow-[0_0_50px_rgba(6,182,212,0.2)]' 
                : 'border-slate-700 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-800/50'}
              ${showSuccess ? 'border-emerald-500 bg-emerald-900/20' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            {/* ESTADO: SUBIENDO */}
            {uploading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full border-t-2 border-l-2 border-cyan-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap size={24} className="text-cyan-400 animate-pulse" />
                  </div>
                </div>
                <p className="mt-6 text-cyan-400 font-bold tracking-[0.2em] animate-pulse">DIGITALIZANDO...</p>
              </div>
            )}

            {/* ESTADO: ÉXITO */}
            {showSuccess && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in zoom-in duration-300">
                <div className="h-24 w-24 bg-gradient-to-tr from-emerald-500 to-green-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                  <CheckCircle size={48} className="text-white drop-shadow-md" />
                </div>
                <h3 className="text-3xl font-black text-white italic tracking-wide">¡MISIÓN CUMPLIDA!</h3>
                <p className="mt-2 text-emerald-400 font-bold flex items-center gap-2 bg-emerald-900/30 px-4 py-1 rounded-full border border-emerald-500/20">
                  <Zap size={16} fill="currentColor" /> +25 PUNTOS ACREDITADOS
                </p>
              </div>
            )}

            {!selectedFile ? (
              <div className="relative z-10 text-center p-8 pointer-events-none transition-transform duration-300 group-hover:scale-105">
                <div className="h-20 w-20 bg-slate-800/80 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/5 group-hover:border-cyan-500/30 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-all">
                  <Scan size={40} className="text-slate-400 group-hover:text-cyan-400 transition-colors" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Arrastra tu Evidencia</h3>
                <p className="text-sm text-slate-400 max-w-xs mx-auto">
                  Soporta JPG, PNG de alta resolución.
                </p>
              </div>
            ) : (
              <div className="relative z-10 flex flex-col items-center w-full h-full p-6">
                 <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl group-hover:shadow-cyan-500/10 transition-all">
                    <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="h-full w-full object-contain bg-slate-950" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur text-white p-2 rounded-lg hover:bg-red-500 transition-colors border border-white/10"
                    >
                      <X size={20} />
                    </button>
                    <div className="absolute bottom-4 left-4 bg-slate-950/80 px-3 py-1 rounded-lg">
                       <p className="text-white font-bold text-sm truncate max-w-[200px]">{selectedFile.name}</p>
                    </div>
                 </div>
              </div>
            )}
            
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleChange}
              disabled={uploading || showSuccess}
              accept="image/*"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || !selectedCategory || uploading}
            className={`
              relative w-full py-5 rounded-2xl font-black text-lg tracking-widest shadow-xl transition-all overflow-hidden group
              ${(!selectedFile || !selectedCategory)
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:scale-[1.01] border border-cyan-400/20'}
            `}
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              {uploading ? 'ENCRIPTANDO...' : 'CONFIRMAR EVIDENCIA'} 
              {!uploading && <ArrowRight />}
            </span>
          </button>
        </div>

        {/* COLUMNA DERECHA (RACHA) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="relative overflow-hidden bg-gradient-to-b from-slate-800 to-slate-950 border border-white/10 p-8 rounded-[2rem] text-center shadow-2xl">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50" />
             <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500 mb-4 ring-1 ring-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)] animate-pulse-slow">
               <Trophy size={40} />
             </div>
             <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Tu Racha</h3>
             <p className="text-sm text-slate-400">Mantén el ritmo para ganar bonos extra.</p>
          </div>
        </div>

      </div>
    </div>
  );
}