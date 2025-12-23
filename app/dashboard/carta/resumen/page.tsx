'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  CheckCircle2, 
  Edit, 
  Loader2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  X,
  Save,
  Calendar,
  Target,
  Lock,
  Sparkles,
  Check
} from 'lucide-react';

// ========== INTERFACES ==========
interface Accion {
  id: number;
  texto: string;
  frequency: string;
  assignedDays: number[];
  requiereEvidencia: boolean;
  specificDate?: string | null;
}

interface Meta {
  id: string | number;
  description?: string;
  texto?: string;
  metaPrincipal?: string;
  declaracionPoder?: string;
  tipo?: 'UNICA' | 'RECURRENTE';
  dias?: string | null;
  area?: string;
  areaKey?: string;
  orden?: number;
  config?: any;
  Accion?: Accion[];
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  mentorFeedback?: string | null;
}

interface Area {
  id: string;
  nombre: string;
  icono: string;
  identidad?: string;
  objetivo?: string;
  metas: Meta[];
}

interface CartaData {
  id: number;
  estado: 'BORRADOR' | 'EN_REVISION' | 'APROBADA' | 'CAMBIOS_REQUERIDOS';
  identidades?: Record<string, string>;
  metasPorArea?: Record<string, Meta[]>;
  metasConfiguradas?: any[];
  Meta?: Meta[];
  [key: string]: any;
}

const DIAS_SEMANA = [
  { id: 1, label: 'Lun', nombre: 'lunes' },
  { id: 2, label: 'Mar', nombre: 'martes' },
  { id: 3, label: 'Mié', nombre: 'miercoles' },
  { id: 4, label: 'Jue', nombre: 'jueves' },
  { id: 5, label: 'Vie', nombre: 'viernes' },
  { id: 6, label: 'Sáb', nombre: 'sabado' },
  { id: 0, label: 'Dom', nombre: 'domingo' }
];

const AREAS_CONFIG = [
  { id: 'finanzas', nombre: 'Finanzas', icono: '💰' },
  { id: 'relaciones', nombre: 'Relaciones', icono: '❤️' },
  { id: 'salud', nombre: 'Salud', icono: '🏃' },
  { id: 'tiempo', nombre: 'Ocio', icono: '⏰' },
  { id: 'ocupacion', nombre: 'Talentos', icono: '💼' },
  { id: 'espiritualidad', nombre: 'Paz Mental', icono: '🙏' }
];

export default function CartaResumenPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [cartaData, setCartaData] = useState<CartaData | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [editedMetas, setEditedMetas] = useState<Set<number>>(new Set()); // IDs de metas editadas
  
  // Estados para el popup de edición
  const [editingMeta, setEditingMeta] = useState<Accion | null>(null);
  const [editForm, setEditForm] = useState({
    texto: '',
    tipoFrecuencia: 'WEEKLY' as 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY',
    dias: [] as number[], // Ahora son números, no strings
    fechaEspecifica: '', // Para ONE_TIME
    diaDelMes: 1 // Para MONTHLY (día del mes)
  });

  // Estados para editar objetivo
  const [editingObjetivo, setEditingObjetivo] = useState<{ areaId: string; texto: string } | null>(null);
  const [objetivoForm, setObjetivoForm] = useState('');

  const isReadOnly = cartaData?.estado === 'APROBADA';

  // ========== FUNCIÓN DE BLOQUEO GRANULAR ==========
  /**
   * Determina si una meta específica puede ser editada basándose en:
   * 1. Estado de la carta (APROBADA, EN_REVISION, CAMBIOS_REQUERIDOS, BORRADOR)
   * 2. Estado individual de la meta (APPROVED, REJECTED, PENDING)
   */
  const isMetaEditable = (meta: Meta): boolean => {
    // Si la carta está aprobada, nadie puede editar nada
    if (cartaData?.estado === 'APROBADA') {
      return false;
    }

    // Si la carta está en revisión, el usuario puede editar mientras espera
    if (cartaData?.estado === 'EN_REVISION') {
      return true;
    }

    // Si la carta está en estado de cambios requeridos
    if (cartaData?.estado === 'CAMBIOS_REQUERIDOS') {
      // SOLO puede editar las metas que fueron rechazadas
      return meta.status === 'REJECTED';
    }

    // Si es borrador, todo es editable
    return true;
  };

  // ========== CARGAR CARTA ==========
  useEffect(() => {
    loadCarta();
  }, []);

  const loadCarta = async () => {
    setLoading(true);
    try {
      // Intentar cargar desde localStorage primero (datos más recientes)
      const savedDraft = localStorage.getItem('carta-wizard-draft');
      let draftData = null;
      
      if (savedDraft) {
        try {
          draftData = JSON.parse(savedDraft);
          console.log('💾 Draft encontrado:', draftData);
        } catch (e) {
          console.log('Error parsing draft:', e);
        }
      }

      // Cargar también desde API
      const res = await fetch('/api/carta/my-carta');
      const data = await res.json();

      console.log('📊 Datos de la carta API:', data);

      if (res.ok && data.carta) {
        console.log('📋 Estado:', data.carta.estado);
        
        // Combinar datos de draft con datos de API
        const cartaCombinada = {
          ...data.carta,
          identidades: draftData?.identidades || {},
          metasPorArea: draftData?.metasPorArea || {},
          metasConfiguradas: draftData?.metasConfiguradas || []
        };
        
        console.log('🔀 Carta combinada:', cartaCombinada);
        
        setCartaData(cartaCombinada);
        organizarMetasPorArea(cartaCombinada);
      } else {
        console.log('❌ No se encontró carta');
        setCartaData(null);
      }
    } catch (error) {
      console.error('Error loading carta:', error);
    } finally {
      setLoading(false);
    }
  };

  const organizarMetasPorArea = (carta: CartaData) => {
    console.log('🔄 Organizando metas de carta:', carta);
    console.log('📊 Estructura completa:', JSON.stringify(carta, null, 2));

    const areasConMetas: Area[] = [];

    // Prioridad 1: Si hay Meta[] (datos guardados en BD desde el wizard)
    if (carta.Meta && Array.isArray(carta.Meta) && carta.Meta.length > 0) {
      console.log('✅ Usando Meta[] de la BD:', carta.Meta);
      
      // Agrupar por categoría (área) y declaración de poder (objetivo)
      const areasPorCategoria: Record<string, { objetivo: string; metas: any[] }[]> = {};
      
      carta.Meta.forEach((meta: any) => {
        // Normalizar el nombre de la categoría a los IDs esperados
        let areaKey = (meta.categoria || '').toLowerCase();
        
        // Mapeo de categorías de BD a IDs de áreas
        const mapeoAreas: Record<string, string> = {
          'finanzas': 'finanzas',
          'relaciones': 'relaciones',
          'salud': 'salud',
          'talentos': 'ocupacion',
          'ocupacion': 'ocupacion',
          'paz mental': 'espiritualidad',
          'pazmental': 'espiritualidad',
          'espiritualidad': 'espiritualidad',
          'ocio': 'tiempo',
          'tiempo': 'tiempo'
        };
        
        areaKey = mapeoAreas[areaKey] || areaKey;
        
        if (!areasPorCategoria[areaKey]) {
          areasPorCategoria[areaKey] = [];
        }
        
        const declaracionPoder = meta.declaracionPoder || '';
        
        // Buscar si ya existe un objetivo con esta declaración de poder
        let objetivoExistente = areasPorCategoria[areaKey].find(
          obj => obj.objetivo === declaracionPoder
        );
        
        if (!objetivoExistente) {
          objetivoExistente = {
            objetivo: declaracionPoder,
            metas: []
          };
          areasPorCategoria[areaKey].push(objetivoExistente);
        }
        
        // Agregar la meta con sus acciones
        objetivoExistente.metas.push({
          id: meta.id,
          description: meta.metaPrincipal,
          texto: meta.metaPrincipal,
          metaPrincipal: meta.metaPrincipal,
          declaracionPoder: meta.declaracionPoder,
          tipo: 'RECURRENTE',
          area: areaKey,
          orden: meta.orden,
          Accion: meta.Accion || [],
          status: meta.status || 'PENDING',
          mentorFeedback: meta.mentorFeedback || null,
          config: {
            declaracionPoder: meta.declaracionPoder
          }
        });
      });

      console.log('📦 Áreas agrupadas por objetivo:', areasPorCategoria);

      // Crear áreas con sus objetivos y metas
      AREAS_CONFIG.forEach(areaConfig => {
        const objetivos = areasPorCategoria[areaConfig.id] || [];
        if (objetivos.length > 0) {
          // Crear un área por cada objetivo
          objetivos.forEach(objetivo => {
            areasConMetas.push({
              id: areaConfig.id,
              nombre: areaConfig.nombre,
              icono: areaConfig.icono,
              identidad: carta.identidades?.[areaConfig.id] || '',
              objetivo: objetivo.objetivo,
              metas: objetivo.metas
            });
          });
        }
      });
    }
    // Prioridad 2: Si hay metasConfiguradas (datos del wizard en memoria)
    else if (carta.metasConfiguradas && carta.metasConfiguradas.length > 0) {
      console.log('✅ Usando metasConfiguradas:', carta.metasConfiguradas);
      
      // Agrupar por área
      const metasPorArea: Record<string, Meta[]> = {};
      carta.metasConfiguradas.forEach(metaConfig => {
        const areaKey = metaConfig.areaKey;
        if (!metasPorArea[areaKey]) {
          metasPorArea[areaKey] = [];
        }
        metasPorArea[areaKey].push({
          id: metaConfig.metaId,
          description: metaConfig.description,
          config: metaConfig.config,
          areaKey: areaKey
        });
      });

      // Crear áreas con sus metas
      AREAS_CONFIG.forEach(areaConfig => {
        const metas = metasPorArea[areaConfig.id] || [];
        if (metas.length > 0 || carta.identidades?.[areaConfig.id]) {
          areasConMetas.push({
            id: areaConfig.id,
            nombre: areaConfig.nombre,
            icono: areaConfig.icono,
            identidad: carta.identidades?.[areaConfig.id] || '',
            metas: metas
          });
        }
      });
    } 
    // Prioridad 3: Fallback a campos antiguos
    else {
      console.log('⚠️ Usando campos antiguos');
      
      const mapeoAreas = [
        { id: 'finanzas', campo: 'finanzasMeta', dias: 'finanzasScheduledDays' },
        { id: 'relaciones', campo: 'relacionesMeta', dias: 'relacionesScheduledDays' },
        { id: 'salud', campo: 'saludMeta', dias: 'saludScheduledDays' },
        { id: 'tiempo', campo: 'ocioMeta', dias: 'ocioScheduledDays' },
        { id: 'ocupacion', campo: 'talentosMeta', dias: 'talentosScheduledDays' },
        { id: 'espiritualidad', campo: 'pazMentalMeta', dias: 'pazMentalScheduledDays' }
      ];

      mapeoAreas.forEach((mapeo, index) => {
        const areaConfig = AREAS_CONFIG.find(a => a.id === mapeo.id);
        if (!areaConfig) return;

        const textoMeta = (carta as any)[mapeo.campo];
        if (!textoMeta || textoMeta.trim() === '') return;

        const diasString = (carta as any)[mapeo.dias];
        let diasArray: string[] = [];
        
        try {
          if (diasString) {
            const parsed = JSON.parse(diasString);
            diasArray = Array.isArray(parsed) ? parsed : [];
          }
        } catch (e) {
          console.log('Error parsing dias:', e);
        }

        const meta: Meta = {
          id: carta.id * 100 + index,
          texto: textoMeta,
          description: textoMeta,
          tipo: diasArray.length > 0 ? 'RECURRENTE' : 'UNICA',
          dias: diasArray.length > 0 ? diasArray.join(',') : null,
          area: mapeo.id,
          orden: index,
          config: {
            frecuencia: diasArray.length > 0 ? 'RECURRENTE' : 'UNICA',
            dias: diasArray
          }
        };

        areasConMetas.push({
          id: areaConfig.id,
          nombre: areaConfig.nombre,
          icono: areaConfig.icono,
          identidad: carta.identidades?.[mapeo.id] || '',
          metas: [meta]
        });
      });
    }

    console.log('📊 Áreas organizadas final:', areasConMetas);
    console.log('📈 Total de áreas con metas:', areasConMetas.length);
    
    // Limpiar metas editadas que ya NO están en status REJECTED
    // (es decir, el mentor ya las revisó)
    if (carta.Meta && Array.isArray(carta.Meta) && carta.Meta.length > 0) {
      setEditedMetas(prev => {
        const newEditedMetas = new Set(prev);
        carta.Meta?.forEach((meta: any) => {
          if (meta.status !== 'REJECTED' && newEditedMetas.has(meta.id)) {
            // Si ya no está rechazada, quitarla de editadas
            newEditedMetas.delete(meta.id);
          }
        });
        return newEditedMetas;
      });
    }
    
    setAreas(areasConMetas);
    
    // Expandir todas las áreas por defecto
    setExpandedAreas(new Set(areasConMetas.map(a => a.id)));
  };

  // ========== TOGGLE ÁREA ==========
  const toggleArea = (areaId: string) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(areaId)) {
      newExpanded.delete(areaId);
    } else {
      newExpanded.add(areaId);
    }
    setExpandedAreas(newExpanded);
  };

  // ========== EDITAR META ==========
  const openEditModal = (accion: Accion, meta: Meta) => {
    // Verificar si la meta es editable basándose en su estado y el estado de la carta
    if (!isMetaEditable(meta)) {
      if (meta.status === 'APPROVED') {
        toast.info('Esta meta ya fue aprobada por tu mentor y no puede ser editada');
      } else if (cartaData?.estado === 'EN_REVISION') {
        toast.info('Tu carta está en revisión. Espera el feedback de tu mentor');
      } else if (cartaData?.estado === 'APROBADA') {
        toast.info('Tu carta ya está aprobada y no puede ser modificada');
      }
      return;
    }
    
    console.log('🔧 Editando acción:', JSON.stringify(accion, null, 2));
    
    // Guardar tanto la acción como el metaId
    setEditingMeta({ ...accion, metaId: meta.id } as any);
    
    // Preparar datos para el formulario
    let tipoFrecuencia: 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'WEEKLY';
    let diasArray: number[] = [];
    let fechaEspecifica = '';
    
    // Mapear frequency a tipoFrecuencia
    if (accion.frequency === 'DAILY') {
      tipoFrecuencia = 'DAILY';
      diasArray = [0, 1, 2, 3, 4, 5, 6];
    } else if (accion.frequency === 'WEEKLY') {
      tipoFrecuencia = 'WEEKLY';
      diasArray = accion.assignedDays || [];
    } else if (accion.frequency === 'MONTHLY') {
      tipoFrecuencia = 'MONTHLY';
      diasArray = accion.assignedDays || [];
    } else if (accion.frequency === 'ONE_TIME') {
      tipoFrecuencia = 'ONE_TIME';
      diasArray = [];
      fechaEspecifica = accion.specificDate || '';
    }
    
    console.log('✅ Datos cargados - Texto:', accion.texto, 'Frecuencia:', tipoFrecuencia, 'Días:', diasArray);
    
    setEditForm({
      texto: accion.texto || '',
      tipoFrecuencia: tipoFrecuencia,
      dias: diasArray,
      fechaEspecifica: fechaEspecifica,
      diaDelMes: diasArray[0] || 1
    });
  };

  const closeEditModal = () => {
    setEditingMeta(null);
    setEditForm({ texto: '', tipoFrecuencia: 'WEEKLY', dias: [], fechaEspecifica: '', diaDelMes: 1 });
  };

  // ========== FUNCIONES PARA EDITAR OBJETIVO ==========
  const openEditObjetivo = (areaId: string, texto: string) => {
    setEditingObjetivo({ areaId, texto });
    setObjetivoForm(texto);
  };

  const closeEditObjetivo = () => {
    setEditingObjetivo(null);
    setObjetivoForm('');
  };

  const handleSaveObjetivo = async () => {
    if (!editingObjetivo) return;

    if (!objetivoForm.trim()) {
      toast.warning('El objetivo no puede estar vacío');
      return;
    }

    try {
      const savedDraft = localStorage.getItem('carta-wizard-draft');
      if (!savedDraft) {
        toast.error('No se encontró el borrador');
        closeEditObjetivo();
        return;
      }

      const draft = JSON.parse(savedDraft);
      if (draft.identidades) {
        draft.identidades[editingObjetivo.areaId] = objetivoForm.trim();
        localStorage.setItem('carta-wizard-draft', JSON.stringify(draft));
        setHasChanges(true);
        await loadCarta();
        closeEditObjetivo();
      }
    } catch (error) {
      console.error('Error al guardar objetivo:', error);
      alert('Error al guardar el objetivo');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMeta || !cartaData) return;

    // Validación
    if (!editForm.texto.trim()) {
      toast.warning('El texto de la acción es requerido');
      return;
    }

    if (editForm.tipoFrecuencia === 'ONE_TIME' && !editForm.fechaEspecifica) {
      toast.warning('Selecciona la fecha para la acción única');
      return;
    }

    if (editForm.tipoFrecuencia === 'WEEKLY' && editForm.dias.length === 0) {
      toast.warning('Selecciona al menos un día para acciones semanales');
      return;
    }

    if (editForm.tipoFrecuencia === 'MONTHLY' && editForm.dias.length === 0) {
      toast.warning('Selecciona al menos un día del mes');
      return;
    }

    try {
      // Preparar assignedDays según el tipo de frecuencia
      let assignedDays: number[] = [];
      let specificDate: string | null = null;

      if (editForm.tipoFrecuencia === 'DAILY') {
        assignedDays = [0, 1, 2, 3, 4, 5, 6];
      } else if (editForm.tipoFrecuencia === 'WEEKLY') {
        // editForm.dias ya son números directamente
        assignedDays = editForm.dias;
      } else if (editForm.tipoFrecuencia === 'MONTHLY') {
        // Para MONTHLY, usar los días del mes directamente
        assignedDays = editForm.dias;
      } else if (editForm.tipoFrecuencia === 'ONE_TIME') {
        assignedDays = [];
        specificDate = editForm.fechaEspecifica;
      }

      console.log('💾 Guardando acción:', {
        id: editingMeta.id,
        texto: editForm.texto,
        frequency: editForm.tipoFrecuencia,
        assignedDays,
        specificDate
      });

      // Actualizar en la base de datos
      const response = await fetch('/api/carta/update-accion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accionId: editingMeta.id,
          texto: editForm.texto,
          frequency: editForm.tipoFrecuencia,
          assignedDays,
          specificDate,
          requiereEvidencia: editingMeta.requiereEvidencia || false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar la acción');
      }

      console.log('✅ Acción actualizada exitosamente');

      // Marcar esta meta como editada
      if ((editingMeta as any).metaId) {
        setEditedMetas(prev => new Set([...prev, (editingMeta as any).metaId]));
      }

      // Recargar la vista
      await loadCarta();
      setHasChanges(true);
      closeEditModal();
      
      toast.success('Acción actualizada correctamente');
    } catch (error) {
      console.error('❌ Error saving acción:', error);
      toast.error('Error al guardar los cambios: ' + error);
    }
  };

  // ========== REENVIAR A REVISIÓN ==========
  const handleResubmit = async () => {
    if (!hasChanges || !cartaData) return;

    // Validar que todas las metas rechazadas hayan sido editadas
    const metasRechazadas = cartaData.Meta?.filter((meta: any) => meta.status === 'REJECTED') || [];
    const metasRechazadasNoEditadas = metasRechazadas.filter((meta: any) => !editedMetas.has(meta.id));
    
    if (metasRechazadasNoEditadas.length > 0) {
      toast.error(
        `⚠️ Debes editar todas las metas rechazadas antes de reenviar. Faltan ${metasRechazadasNoEditadas.length} meta(s) por editar.`
      );
      return;
    }

    setSubmitting(true);
    try {
      // Actualizar el estado de la carta a EN_REVISION
      const res = await fetch(`/api/carta/update-estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartaId: cartaData.id,
          estado: 'EN_REVISION'
        })
      });

      if (res.ok) {
        setHasChanges(false);
        // NO limpiar editedMetas - mantener las metas editadas marcadas en azul
        setCartaData({ ...cartaData, estado: 'EN_REVISION' });
        toast.success('✅ Cambios reenviados para revisión');
        
        // Recargar la carta para reflejar los cambios
        await loadCarta();
      } else {
        const errorData = await res.json();
        toast.error('Error al reenviar cambios: ' + (errorData.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error resubmitting:', error);
      toast.error('Error al reenviar cambios');
    } finally {
      setSubmitting(false);
    }
  };

  // ========== RENDER LOADING ==========
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1015] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!cartaData) return null;

  // ========== RENDER BADGE ESTADO ==========
  const getEstadoBadge = () => {
    switch (cartaData.estado) {
      case 'EN_REVISION':
        return (
          <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-bold flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            En Revisión
          </span>
        );
      case 'APROBADA':
        return (
          <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-bold flex items-center gap-2">
            <CheckCircle2 size={16} />
            Aprobada
          </span>
        );
      case 'CAMBIOS_REQUERIDOS':
        return (
          <span className="px-4 py-2 bg-red-500/20 text-red-400 rounded-full text-sm font-bold flex items-center gap-2">
            <AlertCircle size={16} />
            Cambios Requeridos
          </span>
        );
      default:
        return null;
    }
  };

  // ========== RENDER FRECUENCIA ==========
  const renderFrecuencia = (meta: Meta) => {
    if (meta.tipo === 'UNICA') {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
          <Target size={12} />
          Única
        </span>
      );
    }

    if (meta.dias) {
      const diasArray = meta.dias.split(',');
      return (
        <div className="flex items-center gap-1 flex-wrap">
          <Calendar size={12} className="text-purple-400" />
          {diasArray.map(dia => {
            const diaConfig = DIAS_SEMANA.find(d => d.nombre === dia.trim());
            return (
              <span
                key={dia}
                className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded"
              >
                {diaConfig?.label || dia}
              </span>
            );
          })}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#0f1015] p-6">
      <div className="max-w-5xl mx-auto">
        {/* ========== HEADER ========== */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-white mb-2">Mi Carta F.R.U.T.O.S.</h1>
              <p className="text-gray-400">Visualiza y gestiona tus metas por área</p>
            </div>
            <div className="flex items-center gap-3">
              {getEstadoBadge()}
            </div>
          </div>

          {/* Alerta de Solo Lectura */}
          {isReadOnly && (
            <div className="bg-green-500/10 border-2 border-green-500/30 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Lock className="text-green-400" size={20} />
              </div>
              <div className="flex-1">
                <p className="text-green-400 font-bold text-sm">
                  ✅ Carta Aprobada - Solo Lectura
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Tu carta ha sido aprobada por tu mentor. No se pueden realizar cambios en este momento.
                </p>
              </div>
            </div>
          )}

          {/* Alerta de Cambios Requeridos */}
          {cartaData?.estado === 'CAMBIOS_REQUERIDOS' && (
            <div className="bg-red-500/10 border-2 border-red-500/30 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="text-red-400 flex-shrink-0 mt-1" size={24} />
                <div className="flex-1">
                  <p className="text-red-300 font-bold text-lg mb-2">
                    ⚠️ Tu mentor solicitó cambios en tu carta
                  </p>
                  <p className="text-gray-300 text-sm mb-3">
                    Las metas marcadas con <span className="text-red-400 font-bold">borde rojo</span> fueron rechazadas y necesitan ser corregidas. 
                    Las metas con <span className="text-green-400 font-bold">borde verde</span> ya están aprobadas y están bloqueadas.
                  </p>
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-200 text-sm font-semibold mb-2">📝 Instrucciones:</p>
                    <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
                      <li>Lee el comentario del mentor en cada meta rechazada</li>
                      <li>Edita <strong>solo</strong> las metas marcadas en rojo (las verdes están bloqueadas)</li>
                      <li>Una vez corregidas, reenvía tu carta para una nueva revisión</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alerta de En Revisión */}
          {cartaData?.estado === 'EN_REVISION' && (
            <div className="bg-blue-500/10 border-2 border-blue-500/30 rounded-xl p-4 flex items-center gap-3 mb-6">
              <Loader2 className="text-blue-400 animate-spin" size={20} />
              <div className="flex-1">
                <p className="text-blue-400 font-bold text-sm">
                  ⏳ Tu carta está en revisión
                </p>
                <p className="text-gray-300 text-xs mt-1">
                  Tu mentor está revisando tu carta. Mientras tanto, puedes seguir editando y mejorando tus metas.
                </p>
              </div>
            </div>
          )}

          {/* Indicador de Cambios Pendientes */}
          {hasChanges && !isReadOnly && (() => {
            const metasRechazadas = cartaData?.Meta?.filter((meta: any) => meta.status === 'REJECTED') || [];
            const metasRechazadasNoEditadas = metasRechazadas.filter((meta: any) => !editedMetas.has(meta.id));
            const puedereenviar = metasRechazadasNoEditadas.length === 0;
            
            return (
              <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="text-amber-400" size={20} />
                <div className="flex-1">
                  <p className="text-amber-400 font-bold text-sm">
                    {puedereenviar ? 'Tienes cambios sin reenviar' : `⚠️ Faltan ${metasRechazadasNoEditadas.length} meta(s) rechazada(s) por editar`}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {puedereenviar 
                      ? 'Recuerda reenviar tu carta para que tu mentor revise las modificaciones.'
                      : 'Debes editar todas las metas rechazadas antes de poder reenviar tu carta.'}
                  </p>
                </div>
                <button
                  onClick={handleResubmit}
                  disabled={submitting || !puedereenviar}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Reenviar Cambios
                  </>
                )}
              </button>
            </div>
            );
          })()}
        </div>

        {/* ========== ÁREAS Y METAS ========== */}
        {!cartaData ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
            <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 font-bold mb-2">No tienes una carta creada</p>
            <p className="text-gray-500 text-sm mb-6">Crea tu carta F.R.U.T.O.S. para comenzar a definir tus metas</p>
            <button
              onClick={() => router.push('/dashboard/carta/wizard-v2')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-all"
            >
              Crear Mi Carta
            </button>
          </div>
        ) : areas.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
            <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 font-bold mb-2">No hay metas configuradas</p>
            <p className="text-gray-500 text-sm mb-6">
              {cartaData.estado === 'BORRADOR' 
                ? 'Tu carta está en borrador. Completa el wizard para agregar tus metas.'
                : 'Aún no has configurado metas en tu carta.'}
            </p>
            {cartaData.estado === 'BORRADOR' && (
              <button
                onClick={() => router.push('/dashboard/carta/wizard-v2')}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-all"
              >
                Completar Wizard
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {areas.map((area) => {
              const isExpanded = expandedAreas.has(area.id);

              return (
                <div
                  key={area.id}
                  className="rounded-2xl border border-indigo-500/30 bg-[#0f172a] p-6 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all duration-300"
                >
                  {/* Header del Área */}
                  <button
                    onClick={() => toggleArea(area.id)}
                    className="w-full flex items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-700/50 hover:border-indigo-500/50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/30">
                        {area.icono}
                      </div>
                      <div className="text-left">
                        <h2 className="text-xl font-bold text-white tracking-wide uppercase">{area.nombre}</h2>
                        <span className="text-xs font-medium text-indigo-300 uppercase tracking-wider">
                          {area.objetivo ? '1 Objetivo' : '0 Objetivos'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1.5 bg-gradient-to-r from-purple-600/30 to-pink-600/30 text-purple-300 rounded-full text-xs font-bold border border-purple-500/30">
                        {(() => {
                          // Contar el total de acciones en todas las metas del área
                          let totalAcciones = 0;
                          area.metas.forEach(meta => {
                            if (meta.Accion && meta.Accion.length > 0) {
                              totalAcciones += meta.Accion.length;
                            }
                          });
                          return totalAcciones;
                        })()}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="text-indigo-400" size={24} />
                      ) : (
                        <ChevronDown className="text-indigo-400" size={24} />
                      )}
                    </div>
                  </button>

                  {/* Metas del Área */}
                  {isExpanded && (
                    <div className="px-6 pb-4 space-y-4">
                      {/* Declaración de Objetivo */}
                      {area.objetivo && (
                        <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/10 border-2 border-purple-500/40 rounded-xl p-5 group hover:border-purple-500/70 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="p-2 bg-purple-500/20 rounded-lg flex-shrink-0">
                                <Sparkles className="text-purple-400" size={22} />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-purple-300 font-bold mb-2 uppercase tracking-wider">🎯 Declaración de OBJETIVO</p>
                                <p className="text-white text-lg font-semibold italic leading-relaxed">"{area.objetivo}"</p>
                              </div>
                            </div>
                            {!isReadOnly && (
                              <button
                                onClick={() => openEditObjetivo(area.id, area.objetivo || '')}
                                className="px-3 py-2 rounded-lg bg-purple-600/20 text-purple-300 text-sm border border-purple-500/30 hover:bg-purple-600 hover:text-white hover:border-purple-500 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0 font-medium"
                                title="Editar objetivo"
                              >
                                ✏️ Editar
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Separador y Título de Acciones */}
                      {area.metas.length > 0 && (
                        <div className="pt-2">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                            <h3 className="text-sm font-bold text-gray-400 tracking-wider flex items-center gap-2">
                              <Target className="text-purple-400" size={16} />
                              ACCIONES
                            </h3>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                          </div>
                        </div>
                      )}

                      {/* Lista de Acciones */}
                      {area.metas.map((meta) => {
                        // Si la meta tiene acciones, mostrar cada acción
                        if (meta.Accion && meta.Accion.length > 0) {
                          return meta.Accion.map((accion, index) => {
                            // Helper para mapear días a nombres
                            const getDayName = (dayNum: number): string => {
                              const diasMap: Record<number, string> = {
                                0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miércoles',
                                4: 'jueves', 5: 'viernes', 6: 'sábado'
                              };
                              return diasMap[dayNum] || `Día ${dayNum}`;
                            };

                            // Verificar si esta meta fue editada
                            const wasEdited = editedMetas.has(meta.id as number);

                            return (
                              <div
                                key={accion.id}
                                className={`group relative rounded-xl p-5 pr-48 border transition-all duration-300 ${
                                  wasEdited && (meta.status === 'REJECTED' || cartaData?.estado === 'EN_REVISION')
                                    ? 'bg-blue-900/10 border-blue-500/50 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10'
                                    : meta.status === 'APPROVED' 
                                    ? 'bg-green-900/10 border-green-500/50 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/10'
                                    : meta.status === 'REJECTED'
                                    ? 'bg-red-900/10 border-red-500/50 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/10'
                                    : 'bg-slate-800/50 border-slate-700 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/10'
                                }`}
                              >
                                {/* Indicador de Estado */}
                                {wasEdited && cartaData?.estado === 'EN_REVISION' && (
                                  <div className="absolute top-3 right-3 flex items-center gap-2 bg-blue-900/50 border border-blue-500 px-3 py-1.5 rounded-full">
                                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                    <span className="text-xs font-bold text-blue-300">En revisión por mentor</span>
                                  </div>
                                )}
                                {wasEdited && meta.status === 'REJECTED' && cartaData?.estado !== 'EN_REVISION' && (
                                  <div className="absolute top-3 right-3 flex items-center gap-2 bg-blue-900/50 border border-blue-500 px-3 py-1.5 rounded-full">
                                    <Edit className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs font-bold text-blue-300">Editada - Lista para reenviar</span>
                                  </div>
                                )}
                                {!wasEdited && meta.status === 'APPROVED' && (
                                  <div className="absolute top-3 right-3 flex items-center gap-2 bg-green-900/50 border border-green-500 px-3 py-1.5 rounded-full">
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                    <span className="text-xs font-bold text-green-300">Aprobada</span>
                                  </div>
                                )}
                                {!wasEdited && meta.status === 'REJECTED' && (
                                  <div className="absolute top-3 right-3 flex items-center gap-2 bg-red-900/50 border border-red-500 px-3 py-1.5 rounded-full">
                                    <AlertCircle className="w-4 h-4 text-red-400" />
                                    <span className="text-xs font-bold text-red-300">Rechazada</span>
                                  </div>
                                )}

                                <div className="flex flex-col gap-4">
                                  <div className="flex items-start gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-sm font-bold shadow-lg flex-shrink-0">
                                      {index + 1}
                                    </span>
                                    <div className="flex-1">
                                      <p className="text-lg text-gray-100 font-medium leading-relaxed mb-3">
                                        {accion.texto}
                                      </p>
                                        
                                        {/* Plan de Acción - Tipo de Recurrencia */}
                                        <div className="space-y-3">
                                          {/* Badge de Tipo de Recurrencia */}
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {accion.frequency === 'ONE_TIME' && (
                                              <span className="inline-flex items-center gap-1.5 text-xs text-blue-300 bg-blue-900/30 px-3 py-1.5 rounded-full font-bold border border-blue-700/50 shadow-sm">
                                                🎯 Única
                                              </span>
                                            )}
                                          </div>

                                          {/* Fecha Específica (ONE_TIME) */}
                                          {(() => {
                                            console.log('📅 DEBUG Resumen - Acción:', {
                                              texto: accion.texto?.substring(0, 40),
                                              frequency: accion.frequency,
                                              specificDate: accion.specificDate,
                                              tieneSpecificDate: !!accion.specificDate
                                            });
                                            return null;
                                          })()}
                                          {accion.frequency === 'ONE_TIME' && accion.specificDate && (
                                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                                              <p className="text-xs text-blue-400 font-bold mb-1">📅 Fecha programada:</p>
                                              <p className="text-sm text-blue-300 font-semibold">
                                                {new Date(accion.specificDate).toLocaleDateString('es-ES', { 
                                                  weekday: 'long', 
                                                  year: 'numeric', 
                                                  month: 'long', 
                                                  day: 'numeric' 
                                                })}
                                              </p>
                                            </div>
                                          )}

                                          {/* Días de la Semana (WEEKLY) */}
                                          {accion.frequency === 'WEEKLY' && accion.assignedDays?.length > 0 && (
                                            <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                                              <p className="text-xs text-purple-400 font-bold mb-2">📅 Días de compromiso:</p>
                                              <div className="flex flex-wrap gap-2">
                                                {accion.assignedDays.map((dayNum: number) => (
                                                  <span
                                                    key={dayNum}
                                                    className="text-xs text-purple-200 bg-purple-500/30 px-3 py-1 rounded-full font-bold capitalize"
                                                  >
                                                    {getDayName(dayNum)}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Día del Mes (MONTHLY) */}
                                          {accion.frequency === 'MONTHLY' && accion.assignedDays?.length > 0 && (
                                            <div className="bg-pink-500/5 border border-pink-500/20 rounded-lg p-3">
                                              <p className="text-xs text-pink-400 font-bold mb-2">📅 Día del mes:</p>
                                              <div className="flex flex-wrap gap-2">
                                                {accion.assignedDays.map((day: number) => (
                                                  <span
                                                    key={day}
                                                    className="text-xs text-pink-200 bg-pink-500/30 px-3 py-1 rounded-full font-bold"
                                                  >
                                                    Día {day}
                                                  </span>
                                                ))}
                                              </div>
                                              <p className="text-xs text-pink-300 mt-2">
                                                Se ejecutará 1 vez al mes
                                              </p>
                                            </div>
                                          )}
                                        </div>

                                        {/* Feedback del Mentor si fue rechazada */}
                                        {meta.status === 'REJECTED' && meta.mentorFeedback && (
                                          <div className="mt-4 bg-red-900/20 border-2 border-red-500/50 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                              <div>
                                                <p className="text-red-300 font-bold text-sm mb-1">⚠️ Comentario del mentor:</p>
                                                <p className="text-red-200 text-sm leading-relaxed">{meta.mentorFeedback}</p>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                  {/* Botón de Edición - Abajo del contenido */}
                                  <div className="flex justify-end gap-3 mt-4">
                                    {isMetaEditable(meta) && (
                                      <button
                                        onClick={() => openEditModal(accion, meta)}
                                        className="px-4 py-2 rounded-lg bg-indigo-600/20 text-indigo-300 text-sm border border-indigo-500/30 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 transition-all opacity-0 group-hover:opacity-100 font-medium flex items-center gap-2"
                                        title="Editar acción"
                                      >
                                        ✏️ Editar
                                      </button>
                                    )}
                                    {!isMetaEditable(meta) && meta.status === 'APPROVED' && (
                                      <div className="flex items-center gap-2 text-green-400 text-sm opacity-50">
                                        <Lock className="w-4 h-4" />
                                        <span>Bloqueada</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        }
                        
                        // Fallback: si no hay acciones, mostrar la meta como antes
                        return (
                          <div
                            key={meta.id}
                            className="group relative rounded-xl bg-slate-800/50 p-5 border border-slate-700 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-lg text-gray-100 font-medium leading-relaxed">
                                  {meta.description || meta.texto || meta.metaPrincipal}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">⚠️ Sin acciones definidas - Completa el wizard para agregar acciones</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Botón de Reenvío (Footer fijo si hay cambios) */}
        {hasChanges && !isReadOnly && (() => {
          const metasRechazadas = cartaData?.Meta?.filter((meta: any) => meta.status === 'REJECTED') || [];
          const metasRechazadasNoEditadas = metasRechazadas.filter((meta: any) => !editedMetas.has(meta.id));
          const puedereenviar = metasRechazadasNoEditadas.length === 0;
          
          return (
            <div className="fixed bottom-6 right-6">
              <button
                onClick={handleResubmit}
                disabled={submitting || !puedereenviar}
                className="px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full font-bold flex items-center gap-3 shadow-lg shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title={!puedereenviar ? `Faltan ${metasRechazadasNoEditadas.length} meta(s) rechazada(s) por editar` : ''}
              >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Enviando Cambios...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Reenviar para Revisión
                </>
              )}
              </button>
            </div>
          );
        })()}
      </div>

      {/* ========== MODAL DE EDICIÓN ========== */}
      {editingMeta && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Editar Meta</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Texto de la Meta */}
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">
                  Texto de la Meta *
                </label>
                <textarea
                  value={editForm.texto}
                  onChange={(e) => setEditForm({ ...editForm, texto: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none resize-none"
                  placeholder="Describe tu meta..."
                />
              </div>

              {/* Frecuencia */}
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-3">
                  Tipo de Frecuencia *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setEditForm({ ...editForm, tipoFrecuencia: 'ONE_TIME', dias: [] })}
                    className={`px-4 py-3 rounded-lg font-bold transition-all text-sm ${
                      editForm.tipoFrecuencia === 'ONE_TIME'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Target className="inline mr-2" size={16} />
                    Única
                  </button>
                  <button
                    onClick={() => setEditForm({ ...editForm, tipoFrecuencia: 'WEEKLY' })}
                    className={`px-4 py-3 rounded-lg font-bold transition-all text-sm ${
                      editForm.tipoFrecuencia === 'WEEKLY'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Calendar className="inline mr-2" size={16} />
                    Semanal
                  </button>
                  <button
                    onClick={() => setEditForm({ ...editForm, tipoFrecuencia: 'DAILY', dias: [] })}
                    className={`px-4 py-3 rounded-lg font-bold transition-all text-sm ${
                      editForm.tipoFrecuencia === 'DAILY'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Calendar className="inline mr-2" size={16} />
                    Diario
                  </button>
                  <button
                    onClick={() => setEditForm({ ...editForm, tipoFrecuencia: 'MONTHLY', dias: [] })}
                    className={`px-4 py-3 rounded-lg font-bold transition-all text-sm ${
                      editForm.tipoFrecuencia === 'MONTHLY'
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Calendar className="inline mr-2" size={16} />
                    Mensual
                  </button>
                </div>
              </div>

              {/* Días de la Semana (solo si es semanal) */}
              {editForm.tipoFrecuencia === 'WEEKLY' && (
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-3">
                    Días de la Semana *
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {DIAS_SEMANA.map((dia) => {
                      const isSelected = editForm.dias.includes(dia.id);
                      return (
                        <button
                          key={dia.id}
                          onClick={() => {
                            if (isSelected) {
                              setEditForm({
                                ...editForm,
                                dias: editForm.dias.filter((d) => d !== dia.id)
                              });
                            } else {
                              setEditForm({
                                ...editForm,
                                dias: [...editForm.dias, dia.id]
                              });
                            }
                          }}
                          className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                            isSelected
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          {dia.label}
                        </button>
                      );
                    })}
                  </div>
                  {editForm.dias.length === 0 && (
                    <p className="text-xs text-red-400 mt-2">
                      ⚠️ Selecciona al menos un día
                    </p>
                  )}
                </div>
              )}

              {/* Fecha específica (solo si es única) */}
              {editForm.tipoFrecuencia === 'ONE_TIME' && (
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-3">
                    📅 Fecha Específica *
                  </label>
                  <div className="relative group">
                    <input
                      type="date"
                      value={editForm.fechaEspecifica}
                      onChange={(e) => setEditForm({ ...editForm, fechaEspecifica: e.target.value })}
                      className="w-full px-5 py-4 bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 rounded-2xl text-white text-base font-semibold focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer
                      [&::-webkit-calendar-picker-indicator]:absolute
                      [&::-webkit-calendar-picker-indicator]:right-4
                      [&::-webkit-calendar-picker-indicator]:w-6
                      [&::-webkit-calendar-picker-indicator]:h-6
                      [&::-webkit-calendar-picker-indicator]:cursor-pointer
                      [&::-webkit-calendar-picker-indicator]:opacity-0
                      [&::-webkit-inner-spin-button]:appearance-none"
                      style={{
                        colorScheme: 'dark'
                      }}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors group-hover:text-blue-400">
                      <Calendar className="text-blue-500" size={22} />
                    </div>
                  </div>
                  {editForm.fechaEspecifica && (
                    <div className="mt-3 p-4 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 border border-blue-500/40 rounded-xl backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <Check className="text-blue-400" size={16} />
                        </div>
                        <p className="text-sm text-blue-200 font-medium">
                          Meta programada para el <span className="text-blue-100 font-bold">{new Date(editForm.fechaEspecifica + 'T00:00:00').toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</span>
                        </p>
                      </div>
                    </div>
                  )}
                  {!editForm.fechaEspecifica && (
                    <div className="mt-2 flex items-center gap-2 text-red-400">
                      <AlertCircle size={16} />
                      <p className="text-sm font-medium">
                        Selecciona la fecha para esta meta única
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Días del mes (mensual) */}
              {editForm.tipoFrecuencia === 'MONTHLY' && (
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-3">
                    📅 Selecciona uno o varios días del mes *
                  </label>
                  
                  {/* Selector visual de días */}
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 rounded-2xl p-5">
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                        const isSelected = editForm.dias.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setEditForm({
                                  ...editForm,
                                  dias: editForm.dias.filter(d => d !== day)
                                });
                              } else {
                                setEditForm({
                                  ...editForm,
                                  dias: [...editForm.dias, day].sort((a, b) => a - b)
                                });
                              }
                            }}
                            className={`aspect-square rounded-xl font-bold text-sm transition-all ${
                              isSelected
                                ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg scale-105'
                                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600 hover:text-white'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {editForm.dias.length > 0 && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-pink-500/10 via-pink-400/10 to-pink-500/10 border border-pink-500/40 rounded-xl backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                          <Calendar className="text-pink-400" size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-pink-200 font-semibold mb-2">
                            ✓ {editForm.dias.length} {editForm.dias.length === 1 ? 'día seleccionado' : 'días seleccionados'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {editForm.dias.map(day => (
                              <span key={day} className="bg-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                                Día {day}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {editForm.dias.length === 0 && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-xs text-red-400">⚠️ Selecciona al menos un día del mes</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Save size={18} />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL EDITAR OBJETIVO ========== */}
      {editingObjetivo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-purple-400" size={24} />
                Editar Objetivo o Meta
              </h2>
              <button
                onClick={closeEditObjetivo}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="text-gray-400" size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Campo de texto */}
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-3">
                  Objetivo o Meta *
                </label>
                <textarea
                  value={objetivoForm}
                  onChange={(e) => setObjetivoForm(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none min-h-[120px] resize-none"
                  placeholder="Escribe tu objetivo o meta para esta área..."
                />
                {!objetivoForm.trim() && (
                  <p className="text-xs text-red-400 mt-2">
                    ⚠️ El objetivo no puede estar vacío
                  </p>
                )}
              </div>

              {/* Info */}
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <p className="text-sm text-purple-300">
                  💡 <strong>Tip:</strong> Define un objetivo claro y específico que te inspire y motive a alcanzar tus metas en esta área.
                </p>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={closeEditObjetivo}
                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveObjetivo}
                disabled={!objetivoForm.trim()}
                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Save size={18} />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
