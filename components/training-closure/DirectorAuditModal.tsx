'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardCheck, Building2, Paintbrush, Users, Send, Loader2, 
  X, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle
} from 'lucide-react';

interface DirectorAuditProps {
  productId: number;
  productName: string;
  onComplete: () => void;
  onClose: () => void;
}

type AuditState = boolean | null;
type ThreeState = 'EXCELENTE' | 'ACEPTABLE' | 'FALLA' | null;

export default function DirectorAuditModal({
  productId,
  productName,
  onComplete,
  onClose
}: DirectorAuditProps) {
  const [currentCard, setCurrentCard] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Tarjeta 1: Momentos de Verdad (Toggles con notas opcionales)
  const [auditRegistro, setAuditRegistro] = useState<AuditState>(null);
  const [auditRegistroNota, setAuditRegistroNota] = useState('');
  const [auditConcentracion, setAuditConcentracion] = useState<AuditState>(null);
  const [auditConcentracionNota, setAuditConcentracionNota] = useState('');
  const [auditBreakLargo, setAuditBreakLargo] = useState<AuditState>(null);
  const [auditBreakLargoNota, setAuditBreakLargoNota] = useState('');
  const [auditEnrolamiento, setAuditEnrolamiento] = useState<AuditState>(null);
  const [auditEnrolamientoNota, setAuditEnrolamientoNota] = useState('');
  const [auditSalaActiva, setAuditSalaActiva] = useState<AuditState>(null);
  const [auditSalaActivaNota, setAuditSalaActivaNota] = useState('');
  const [auditBreakCorto, setAuditBreakCorto] = useState<AuditState>(null);
  const [auditBreakCortoNota, setAuditBreakCortoNota] = useState('');

  // Tarjeta 2: Excelencia del Salón
  const [limpiezaGeneral, setLimpiezaGeneral] = useState<ThreeState>(null);
  const [equipoSonido, setEquipoSonido] = useState<ThreeState>(null);
  const [visualesPantalla, setVisualesPantalla] = useState<ThreeState>(null);
  const [materialesRotafolio, setMaterialesRotafolio] = useState<ThreeState>(null);
  const [insumosBaul, setInsumosBaul] = useState<ThreeState>(null);
  const [cumplimientoTareas, setCumplimientoTareas] = useState<ThreeState>(null);
  const [mesaControl, setMesaControl] = useState<ThreeState>(null);

  // Tarjeta 3: Excelencia de Instalaciones
  const [climaAire, setClimaAire] = useState<ThreeState>(null);
  const [banosLimpieza, setBanosLimpieza] = useState<ThreeState>(null);
  const [sillasEstado, setSillasEstado] = useState<ThreeState>(null);
  const [pinturaParedes, setPinturaParedes] = useState<ThreeState>(null);
  const [brandingVinilos, setBrandingVinilos] = useState<ThreeState>(null);

  // Tarjeta 4: Imagen Profesional
  const [liderazgoCapitanias, setLiderazgoCapitanias] = useState(5);
  const [disciplinaPuntualidad, setDisciplinaPuntualidad] = useState<ThreeState>(null);
  const [imagenStaff, setImagenStaff] = useState<ThreeState>(null);
  const [imagenCoordinador, setImagenCoordinador] = useState<ThreeState>(null);
  const [contextoAlineamiento, setContextoAlineamiento] = useState<ThreeState>(null);

  // Cierre
  const [observaciones, setObservaciones] = useState('');

  const cards = [
    { title: 'Momentos de Verdad', icon: <ClipboardCheck className="w-5 h-5" />, color: 'purple' },
    { title: 'Excelencia del Salón', icon: <Building2 className="w-5 h-5" />, color: 'blue' },
    { title: 'Excelencia de Instalaciones', icon: <Paintbrush className="w-5 h-5" />, color: 'emerald' },
    { title: 'Imagen Profesional', icon: <Users className="w-5 h-5" />, color: 'pink' },
    { title: 'Cierre', icon: <CheckCircle2 className="w-5 h-5" />, color: 'green' }
  ];

  // Componente Toggle Verde/Rojo
  const AuditToggle = ({ 
    value, 
    onChange, 
    noteValue, 
    onNoteChange, 
    label 
  }: { 
    value: AuditState; 
    onChange: (v: boolean) => void; 
    noteValue: string; 
    onNoteChange: (v: string) => void; 
    label: string;
  }) => (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white text-sm">{label}</span>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              onChange(true);
              if (navigator.vibrate) navigator.vibrate(20);
            }}
            className={`w-12 h-8 rounded-lg font-bold text-xs transition-all ${
              value === true
                ? 'bg-[#39FF14] text-black shadow-[0_0_15px_rgba(57,255,20,0.5)]'
                : 'bg-slate-700/50 text-slate-400'
            }`}
          >
            ✓
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              onChange(false);
              if (navigator.vibrate) navigator.vibrate(20);
            }}
            className={`w-12 h-8 rounded-lg font-bold text-xs transition-all ${
              value === false
                ? 'bg-[#FF0000] text-white shadow-[0_0_15px_rgba(255,0,0,0.5)]'
                : 'bg-slate-700/50 text-slate-400'
            }`}
          >
            ✗
          </motion.button>
        </div>
      </div>
      <AnimatePresence>
        {value === false && (
          <motion.input
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            type="text"
            value={noteValue}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="¿Qué falló?"
            className="w-full px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-white text-sm placeholder-red-400/50 focus:outline-none focus:border-red-500"
          />
        )}
      </AnimatePresence>
    </div>
  );

  // Componente de 3 Estados
  const ThreeStateSelector = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: ThreeState; 
    onChange: (v: ThreeState) => void; 
    label: string;
  }) => (
    <div className="mb-4">
      <span className="text-white text-sm block mb-2">{label}</span>
      <div className="grid grid-cols-3 gap-2">
        {[
          { value: 'EXCELENTE' as ThreeState, label: 'Excelente', color: '#39FF14', bgColor: 'bg-green-500/20' },
          { value: 'ACEPTABLE' as ThreeState, label: 'Aceptable', color: '#FFAA00', bgColor: 'bg-amber-500/20' },
          { value: 'FALLA' as ThreeState, label: 'Falla', color: '#FF0000', bgColor: 'bg-red-500/20' }
        ].map((option) => (
          <motion.button
            key={option.value}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              onChange(option.value);
              if (navigator.vibrate) navigator.vibrate(20);
            }}
            className={`p-2 rounded-lg text-xs font-medium transition-all ${
              value === option.value
                ? `${option.bgColor} border-2`
                : 'bg-slate-700/30 border-2 border-transparent'
            }`}
            style={{
              borderColor: value === option.value ? option.color : 'transparent',
              color: value === option.value ? option.color : '#94a3b8',
              boxShadow: value === option.value ? `0 0 10px ${option.color}40` : 'none'
            }}
          >
            {option.label}
          </motion.button>
        ))}
      </div>
    </div>
  );

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      const res = await fetch('/api/director/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          // Tarjeta 1
          auditRegistro,
          auditRegistroNota: auditRegistro === false ? auditRegistroNota : null,
          auditConcentracion,
          auditConcentracionNota: auditConcentracion === false ? auditConcentracionNota : null,
          auditBreakLargo,
          auditBreakLargoNota: auditBreakLargo === false ? auditBreakLargoNota : null,
          auditEnrolamiento,
          auditEnrolamientoNota: auditEnrolamiento === false ? auditEnrolamientoNota : null,
          auditSalaActiva,
          auditSalaActivaNota: auditSalaActiva === false ? auditSalaActivaNota : null,
          auditBreakCorto,
          auditBreakCortoNota: auditBreakCorto === false ? auditBreakCortoNota : null,
          // Tarjeta 2
          limpiezaGeneral,
          equipoSonido,
          visualesPantalla,
          materialesRotafolio,
          insumosBaul,
          cumplimientoTareas,
          mesaControl,
          // Tarjeta 3
          climaAire,
          banosLimpieza,
          sillasEstado,
          pinturaParedes,
          brandingVinilos,
          // Tarjeta 4
          liderazgoCapitanias,
          disciplinaPuntualidad,
          imagenStaff,
          imagenCoordinador,
          contextoAlineamiento,
          // Cierre
          observaciones: observaciones || null
        })
      });

      if (res.ok) {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
        onComplete();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al enviar la auditoría');
      }
    } catch (error) {
      console.error('Error submitting audit:', error);
      alert('Error al enviar la auditoría');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCard = () => {
    switch (currentCard) {
      case 0: // Momentos de Verdad
        return (
          <div className="space-y-1">
            <AuditToggle
              label="Registro Inicial"
              value={auditRegistro}
              onChange={setAuditRegistro}
              noteValue={auditRegistroNota}
              onNoteChange={setAuditRegistroNota}
            />
            <AuditToggle
              label="Momento de Concentración/Contribución"
              value={auditConcentracion}
              onChange={setAuditConcentracion}
              noteValue={auditConcentracionNota}
              onNoteChange={setAuditConcentracionNota}
            />
            <AuditToggle
              label="Break Largo Activo"
              value={auditBreakLargo}
              onChange={setAuditBreakLargo}
              noteValue={auditBreakLargoNota}
              onNoteChange={setAuditBreakLargoNota}
            />
            <AuditToggle
              label="Tiempo de Enrolamiento"
              value={auditEnrolamiento}
              onChange={setAuditEnrolamiento}
              noteValue={auditEnrolamientoNota}
              onNoteChange={setAuditEnrolamientoNota}
            />
            <AuditToggle
              label="Bloque Activo en Sala"
              value={auditSalaActiva}
              onChange={setAuditSalaActiva}
              noteValue={auditSalaActivaNota}
              onNoteChange={setAuditSalaActivaNota}
            />
            <AuditToggle
              label="Break Corto Activo"
              value={auditBreakCorto}
              onChange={setAuditBreakCorto}
              noteValue={auditBreakCortoNota}
              onNoteChange={setAuditBreakCortoNota}
            />
          </div>
        );

      case 1: // Excelencia del Salón
        return (
          <div className="space-y-1">
            <ThreeStateSelector label="Limpieza General" value={limpiezaGeneral} onChange={setLimpiezaGeneral} />
            <ThreeStateSelector label="Equipo de Sonido (Calidad/Volumen)" value={equipoSonido} onChange={setEquipoSonido} />
            <ThreeStateSelector label="Visuales: Pantalla/Proyector" value={visualesPantalla} onChange={setVisualesPantalla} />
            <ThreeStateSelector label="Materiales: Rotafolio y Marcadores" value={materialesRotafolio} onChange={setMaterialesRotafolio} />
            <ThreeStateSelector label="Insumos: Baúl y Tickets de Vida" value={insumosBaul} onChange={setInsumosBaul} />
            <ThreeStateSelector label="Cumplimiento: Tareas y Reglas" value={cumplimientoTareas} onChange={setCumplimientoTareas} />
            <ThreeStateSelector label="Mesa de Control: Orden Staff/Trainer" value={mesaControl} onChange={setMesaControl} />
          </div>
        );

      case 2: // Excelencia de Instalaciones
        return (
          <div className="space-y-1">
            <ThreeStateSelector label="Clima: Aire Acondicionado" value={climaAire} onChange={setClimaAire} />
            <ThreeStateSelector label="Baños: Limpieza y Suministros" value={banosLimpieza} onChange={setBanosLimpieza} />
            <ThreeStateSelector label="Sillas: Estado Físico" value={sillasEstado} onChange={setSillasEstado} />
            <ThreeStateSelector label="Pintura: Estado de Paredes" value={pinturaParedes} onChange={setPinturaParedes} />
            <ThreeStateSelector label="Branding: Vinilos y Anuncios" value={brandingVinilos} onChange={setBrandingVinilos} />
          </div>
        );

      case 3: // Imagen Profesional
        return (
          <div className="space-y-4">
            {/* Liderazgo - Slider 1-10 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white text-sm">Liderazgo: Capitanías Asignadas</span>
                <span className="text-purple-400 font-bold">{liderazgoCapitanias}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={liderazgoCapitanias}
                onChange={(e) => setLiderazgoCapitanias(parseInt(e.target.value))}
                className="w-full h-3 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, 
                    #a855f7 0%, 
                    #a855f7 ${(liderazgoCapitanias - 1) * 11.1}%, 
                    #334155 ${(liderazgoCapitanias - 1) * 11.1}%, 
                    #334155 100%)`
                }}
              />
            </div>

            <ThreeStateSelector label="Disciplina: Puntualidad (Inicio/Breaks)" value={disciplinaPuntualidad} onChange={setDisciplinaPuntualidad} />
            <ThreeStateSelector label="Imagen: Vestimenta del Staff" value={imagenStaff} onChange={setImagenStaff} />
            <ThreeStateSelector label="Imagen: Vestimenta del Coordinador" value={imagenCoordinador} onChange={setImagenCoordinador} />
            <ThreeStateSelector label="Contexto: Alineamiento (Actitud/Energía)" value={contextoAlineamiento} onChange={setContextoAlineamiento} />
          </div>
        );

      case 4: // Cierre
        return (
          <div>
            <p className="text-slate-400 text-sm mb-3">Observaciones Generales</p>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Escribe tus observaciones finales..."
              className="w-full h-40 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 resize-none"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 overflow-y-auto"
    >
      <div className="min-h-full p-4 flex flex-col max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Auditoría de Calidad</h2>
            <p className="text-slate-400 text-sm">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {cards.map((card, index) => (
            <motion.div
              key={index}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === currentCard
                  ? 'bg-purple-500 w-6'
                  : index < currentCard
                  ? 'bg-green-500'
                  : 'bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Card Title */}
        <motion.div
          key={currentCard}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 flex-1 mb-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg bg-${cards[currentCard].color}-500/20 text-${cards[currentCard].color}-400`}>
              {cards[currentCard].icon}
            </div>
            <h3 className="text-lg font-bold text-white">{cards[currentCard].title}</h3>
          </div>

          {renderCard()}
        </motion.div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentCard > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentCard(prev => prev - 1)}
              className="flex-1 py-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-white font-semibold flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Anterior
            </motion.button>
          )}

          {currentCard < cards.length - 1 ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentCard(prev => prev + 1)}
              className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-bold flex items-center justify-center gap-2"
            >
              Siguiente
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-green-500/30"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  CERTIFICAR AUDITORÍA
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
