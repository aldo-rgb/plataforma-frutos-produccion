'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Sparkles, AlertCircle, Loader2, CheckCircle2, Brain, Atom, Settings, Send } from 'lucide-react';
import { validateYoSoy } from '@/lib/validaciones-carta';
import { extractSmartInfo, generateClosingMessage, type ExtractedInfo } from '@/lib/smart-extractor';
import MetaInputDynamic from './MetaInputDynamic';
import ConfiguradorAccionIterativo from './ConfiguradorAccionIterativo';
import QuantumCoachModal from './QuantumCoachModal';
import AreaConfigurator from './AreaConfigurator';

interface WizardStep {
  id: number;
  title: string;
  subtitle: string;
  emoji: string;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'SER', subtitle: 'Quién ser', emoji: '🧘' },
  { id: 2, title: 'Objetivo', subtitle: 'Visualización', emoji: '✨' },
  { id: 3, title: 'HACER', subtitle: 'Acciones', emoji: '🎯' },
  { id: 4, title: 'Plan de Acción', subtitle: 'Frecuencia', emoji: '🔥' }
];

const AREAS = [
  { key: 'finanzas', name: 'FINANZAS', emoji: '💰', placeholder: 'Ejemplo: Yo soy abundancia en crecimiento constante' },
  { key: 'relaciones', name: 'RELACIONES', emoji: '❤️', placeholder: 'Ejemplo: Yo soy amor en acción que construye vínculos genuinos' },
  { key: 'talentos', name: 'TALENTOS', emoji: '🎨', placeholder: 'Ejemplo: Yo soy creatividad que transforma ideas en realidad' },
  { key: 'salud', name: 'SALUD', emoji: '💪', placeholder: 'Ejemplo: Yo soy energía vital que cuida mi templo sagrado' },
  { key: 'pazMental', name: 'PAZ MENTAL', emoji: '🧘', placeholder: 'Ejemplo: Yo soy serenidad que fluye en cada respiración' },
  { key: 'ocio', name: 'OCIO', emoji: '🎮', placeholder: 'Ejemplo: Yo soy disfrute consciente en cada momento de descanso' },
  { key: 'servicioTrans', name: 'SERVICIO TRANSFORMACIONAL', emoji: '🌟', placeholder: 'Ejemplo: Yo soy impacto positivo que eleva vidas' },
  { key: 'servicioComun', name: 'SERVICIO COMUNITARIO', emoji: '🤝', placeholder: 'Ejemplo: Yo soy contribución que fortalece mi comunidad' }
];

interface Meta {
  id: string;
  description: string;
  isValid: boolean;
}

interface MetaConfig {
  metaId: string;
  areaKey: string;
  description: string;
  config: any;
}

export default function CartaWizardRelacional() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState<{ show: boolean; title: string; message: string }>({ 
    show: false, 
    title: '', 
    message: '' 
  });
  
  // NUEVO: Estado para saber si el usuario pertenece a un grupo/visión
  const [perteneceAGrupo, setPerteneceAGrupo] = useState(false);
  const [areasActivas, setAreasActivas] = useState<typeof AREAS>([]);
  const [showAreaConfig, setShowAreaConfig] = useState(false);
  
  // PASO 1: Declaración del Ser (NUEVO)
  const [declaracionesSer, setDeclaracionesSer] = useState<Record<string, string>>({});
  const [showQuantumModal, setShowQuantumModal] = useState(false);
  const [showQuantumSuccessNotification, setShowQuantumSuccessNotification] = useState(false);
  
  // PASO 2: Identidades (Múltiples por área)
  const [identidadesPorArea, setIdentidadesPorArea] = useState<Record<string, Meta[]>>({});
  
  // PASO 2: Estados para sugerencias QUANTUM
  const [loadingSuggestions, setLoadingSuggestions] = useState<string | null>(null);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState<{
    show: boolean;
    area: string;
    suggestions: string[];
  }>({ show: false, area: '', suggestions: [] });
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]); // Track de seleccionadas
  
  // PASO 3: Metas por área (modelo relacional) - NUEVO: Vinculadas a objetivos del Paso 2
  const [metasPorArea, setMetasPorArea] = useState<Record<string, Meta[]>>({});
  const [currentObjetivoIndexStep3, setCurrentObjetivoIndexStep3] = useState(0); // Índice del objetivo actual en Paso 3
  
  // PASO 3: Estados para sugerencias QUANTUM de acciones
  const [loadingActionSuggestions, setLoadingActionSuggestions] = useState(false);
  const [actionSuggestionsByObjetivo, setActionSuggestionsByObjetivo] = useState<Record<string, string[]>>({}); // Sugerencias inline por objetivo
  const [showActionSuggestionsModal, setShowActionSuggestionsModal] = useState<{
    show: boolean;
    objetivo: string;
    objetoId: string;
    suggestions: string[];
  }>({ show: false, objetivo: '', objetoId: '', suggestions: [] });
  const [selectedActionSuggestions, setSelectedActionSuggestions] = useState<string[]>([]);
  
  // Sistema de notificaciones toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // PASO 4: Iterador de configuración
  const [currentMetaIndex, setCurrentMetaIndex] = useState(0);
  const [metasConfiguradas, setMetasConfiguradas] = useState<MetaConfig[]>([]);
  
  // NUEVO: Sistema de Autocompletado Inteligente
  const [extractedInfoByMeta, setExtractedInfoByMeta] = useState<Record<string, ExtractedInfo>>({});
  const [showSmartSuggestion, setShowSmartSuggestion] = useState<string | null>(null);
  
  const [estado, setEstado] = useState('BORRADOR');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('guest');
  
  // Función para mostrar toast temporal
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  // Sistema de Detección de Cambios (Dirty State)
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<{
    identidadesPorArea: Record<string, Meta[]>;
    metasPorArea: Record<string, Meta[]>;
    metasConfiguradas: MetaConfig[];
  } | null>(null);

  // Modo solo lectura si está aprobada
  const isReadOnly = estado === 'APROBADA';

  useEffect(() => {
    loadCarta();
  }, []);

  const loadCarta = async () => {
    try {
      // PRIMERO: Obtener datos del usuario actual
      const res = await fetch('/api/carta/my-carta');
      const data = await res.json();
      
      console.log('📥 Data from API:', data);
      
      // NUEVO: Obtener configuración personalizada de áreas
      const areasConfigRes = await fetch('/api/areas-config');
      const areasConfigData = await areasConfigRes.json();
      
      console.log('⚙️ Areas config:', areasConfigData);
      
      const perteneceGrupo = areasConfigData.perteneceAGrupo || false;
      
      // Filtrar áreas según configuración personalizada
      const areasHabilitadas = areasConfigData.areas || [];
      const areasFiltradas = AREAS.filter(area => {
        const config = areasHabilitadas.find((c: any) => c.areaKey === area.key);
        
        // Si hay configuración explícita, usar esa
        if (config) {
          return config.enabled;
        }
        
        // Si NO pertenece a grupo, excluir servicios
        if (!perteneceGrupo && (area.key === 'servicioTrans' || area.key === 'servicioComun')) {
          return false;
        }
        
        // Por defecto, habilitadas las demás
        return true;
      });
      
      setAreasActivas(areasFiltradas);
      setPerteneceAGrupo(perteneceGrupo);
      console.log(`📋 Áreas activas configuradas:`, areasFiltradas.map(a => a.name));
      
      // Obtener ID del usuario para el localStorage key específico
      const email = data.carta?.Usuario?.email || 'guest';
      setUserEmail(email);
      const localStorageKey = `carta-wizard-draft-${email}`;
      
      // SEGUNDO: Intentar cargar borrador desde localStorage ESPECÍFICO DEL USUARIO
      const savedDraft = localStorage.getItem(localStorageKey);
      console.log('💾 localStorage draft:', savedDraft);
      
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          console.log('📦 Draft parseado:', draft);
          
          if (draft.declaracionesSer && Object.keys(draft.declaracionesSer).length > 0) {
            console.log('✅ Cargando declaraciones del ser desde draft');
            setDeclaracionesSer(draft.declaracionesSer);
          }
          if (draft.identidadesPorArea && Object.keys(draft.identidadesPorArea).length > 0) {
            console.log('✅ Cargando identidades por área desde draft');
            setIdentidadesPorArea(draft.identidadesPorArea);
          }
          if (draft.metasPorArea && Object.keys(draft.metasPorArea).length > 0) {
            console.log('✅ Cargando metasPorArea desde draft:', draft.metasPorArea);
            setMetasPorArea(draft.metasPorArea);
          }
          if (draft.metasConfiguradas && draft.metasConfiguradas.length > 0) {
            console.log('✅ Cargando metasConfiguradas desde draft:', draft.metasConfiguradas);
            setMetasConfiguradas(draft.metasConfiguradas);
          }
          if (draft.currentStep) {
            console.log('✅ Cargando currentStep:', draft.currentStep);
            setCurrentStep(draft.currentStep);
          }
          if (draft.currentMetaIndex !== undefined) {
            console.log('✅ Cargando currentMetaIndex:', draft.currentMetaIndex);
            setCurrentMetaIndex(draft.currentMetaIndex);
          }
          console.log('✅ Borrador cargado completamente desde localStorage');
          setDataLoaded(true);
          
          // Guardar snapshot original para comparación
          setOriginalData({
            identidadesPorArea: draft.identidadesPorArea || {},
            metasPorArea: draft.metasPorArea || {},
            metasConfiguradas: draft.metasConfiguradas || []
          });
          setDeclaracionesSer(draft.declaracionesSer || {});
        } catch (e) {
          console.error('❌ Error parsing draft:', e);
        }
      } else {
        console.log('⚠️ No hay draft en localStorage, cargando desde API...');
      }
      
      if (data.carta) {
        setEstado(data.carta.estado || 'BORRADOR');
        
        // Si NO hay draft en localStorage, cargar desde el API
        if (!savedDraft) {
          // Cargar declaraciones del ser
          const loadedDeclaracionesSer: Record<string, string> = {};
          areasFiltradas.forEach(area => {
            loadedDeclaracionesSer[area.key] = data.carta[`${area.key}Ser`] || '';
          });
          setDeclaracionesSer(loadedDeclaracionesSer);
          
          // Cargar identidades por área (si existen en la DB)
          const loadedIdentidadesPorArea: Record<string, Meta[]> = {};
          areasFiltradas.forEach(area => {
            const declaracion = data.carta[`${area.key}Declaracion`];
            if (declaracion) {
              // Convertir el string del API a array de Metas
              loadedIdentidadesPorArea[area.key] = [{
                id: `${area.key}-api-${Date.now()}`,
                description: declaracion,
                isValid: true
              }];
            } else {
              loadedIdentidadesPorArea[area.key] = [];
            }
          });
          console.log('📋 Identidades cargadas del API:', loadedIdentidadesPorArea);
          setIdentidadesPorArea(loadedIdentidadesPorArea);
          setDataLoaded(true);
          
          // Guardar snapshot original
          setOriginalData({
            identidadesPorArea: loadedIdentidadesPorArea,
            metasPorArea: {},
            metasConfiguradas: []
          });
        }
      }
    } catch (error) {
      console.error('❌ Error loading carta:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async () => {
    if (estado === 'APROBADA') return;

    setSaving(true);
    try {
      // Guardar borrador completo en localStorage SIEMPRE con key específica del usuario
      const draft = {
        declaracionesSer,
        identidadesPorArea,
        metasPorArea,
        metasConfiguradas,
        currentStep,
        currentMetaIndex,
        timestamp: new Date().toISOString()
      };
      const localStorageKey = `carta-wizard-draft-${userEmail}`;
      localStorage.setItem(localStorageKey, JSON.stringify(draft));
      console.log(`💾 Borrador guardado en localStorage para ${userEmail}`);
      
      // Preparar datos para guardar en BD
      const cartaData: any = {};
      
      // Guardar declaraciones del ser (solo áreas activas)
      areasActivas.forEach(area => {
        cartaData[`${area.key}Ser`] = declaracionesSer[area.key] || '';
      });
      
      // Guardar identidades (convertir array a string por ahora)
      areasActivas.forEach(area => {
        const identidades = identidadesPorArea[area.key] || [];
        // Guardar solo la primera identidad en el campo existente por compatibilidad
        cartaData[`${area.key}Declaracion`] = identidades.length > 0 ? identidades[0].description : '';
      });
      
      await fetch('/api/carta/my-carta', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cartaData)
      });
      
      console.log('✅ Progreso guardado en servidor');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save con debounce
  useEffect(() => {
    if (!loading && estado !== 'APROBADA') {
      const timer = setTimeout(() => {
        saveProgress();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [declaracionesSer, identidadesPorArea, metasPorArea, metasConfiguradas, currentStep, currentMetaIndex]);

  // ========== VALIDACIONES ==========
  
  // Nuevo Paso 1: Declaración del Ser
  const validateStep1 = () => {
    return areasActivas.every(area => validateYoSoy(declaracionesSer[area.key] || ''));
  };

  // Paso 2: Identidades (Múltiples por área)
  const validateStep2 = () => {
    return areasActivas.every(area => {
      const identidades = identidadesPorArea[area.key] || [];
      return identidades.length > 0 && identidades.every(i => i.isValid);
    });
  };

  // Paso 3: Metas SMART - Ahora vinculadas a objetivos específicos
  const validateStep3 = () => {
    // Si ya hay metas configuradas en el Paso 4, el Paso 3 es válido
    if (metasConfiguradas.length > 0) {
      return true;
    }
    
    // Verificar que cada objetivo del Paso 2 tenga al menos una acción SMART
    const objetivos = getObjetivosFlattened();
    return objetivos.every(obj => {
      const accionesPorObjetivo = metasPorArea[obj.objetivo.id] || [];
      return accionesPorObjetivo.length > 0 && accionesPorObjetivo.every(m => m.isValid);
    });
  };

  // Paso 4: Plan de Acción
  const validateStep4 = () => {
    // Usar metasFlattened.length en lugar de recalcular
    const totalAcciones = metasFlattened.length;
    
    console.log('📊 Validación Paso 4:', {
      totalAcciones,
      metasConfiguradas: metasConfiguradas.length,
      metasFlattened: metasFlattened.length,
      isValid: metasConfiguradas.length === totalAcciones && totalAcciones > 0
    });
    
    return metasConfiguradas.length === totalAcciones && totalAcciones > 0;
  };

  const canAdvanceToStep2 = () => validateStep1();
  const canAdvanceToStep3 = () => validateStep1() && validateStep2();
  const canAdvanceToStep4 = () => validateStep1() && validateStep2() && validateStep3();
  const canSubmit = () => validateStep1() && validateStep2() && validateStep3() && validateStep4();

  // ========== NAVEGACIÓN PASO 3 (ITERATIVA) - OBJETIVOS ==========
  
  // Obtener lista plana de objetivos del Paso 2 para iterar en Paso 3
  const getObjetivosFlattened = (): { areaKey: string; areaName: string; areaEmoji: string; objetivo: Meta; index: number; total: number }[] => {
    const flattened: any[] = [];
    areasActivas.forEach(area => {
      const objetivos = identidadesPorArea[area.key] || [];
      objetivos.forEach((objetivo, idx) => {
        flattened.push({
          areaKey: area.key,
          areaName: area.name,
          areaEmoji: area.emoji,
          objetivo: objetivo,
          index: flattened.length + 1,
          total: 0
        });
      });
    });
    
    flattened.forEach(item => item.total = flattened.length);
    return flattened;
  };

  const objetivosFlattened = getObjetivosFlattened();
  const currentObjetivoData = objetivosFlattened[currentObjetivoIndexStep3];

  // AUTO-CARGAR sugerencias QUANTUM cuando se entra al Paso 3 con un objetivo nuevo
  useEffect(() => {
    if (currentStep === 3 && currentObjetivoData && !isReadOnly) {
      const objetoId = currentObjetivoData.objetivo.id;
      
      // Solo cargar si no hay sugerencias ya cargadas para este objetivo
      if (!showActionSuggestionsModal.objetoId || showActionSuggestionsModal.objetoId !== objetoId) {
        handleGetActionSuggestions(
          currentObjetivoData.objetivo.description,
          currentObjetivoData.objetivo.id,
          currentObjetivoData.areaKey
        );
      }
    }
  }, [currentStep, currentObjetivoIndexStep3, currentObjetivoData?.objetivo.id]);

  // QUANTUM: Función para obtener sugerencias de objetivos
  const handleGetSuggestions = async (areaKey: string) => {
    setLoadingSuggestions(areaKey);
    try {
      const identityStatement = declaracionesSer[areaKey] || '';
      
      // Detectar timezone del usuario
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const response = await fetch('/api/quantum/sugerir-objetivos', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-timezone': userTimezone
        },
        body: JSON.stringify({
          area: areaKey,
          identityStatement
        })
      });

      if (!response.ok) throw new Error('Error obteniendo sugerencias');

      const data = await response.json();
      
      setShowSuggestionsModal({
        show: true,
        area: areaKey,
        suggestions: data.objetivos || []
      });
    } catch (error) {
      console.error('Error obteniendo sugerencias:', error);
      setErrorModal({
        show: true,
        title: 'Error',
        message: 'No se pudieron obtener sugerencias. Intenta nuevamente.'
      });
    } finally {
      setLoadingSuggestions(null);
    }
  };

  // QUANTUM: Función para seleccionar una sugerencia
  const handleSelectSuggestion = (suggestion: string, areaKey: string) => {
    // Verificar si ya fue seleccionada
    if (selectedSuggestions.includes(suggestion)) {
      return; // Ya está agregada, no hacer nada
    }

    const newMeta: Meta = {
      id: `${areaKey}-${Date.now()}`,
      description: suggestion,
      isValid: true
    };

    const currentMetas = identidadesPorArea[areaKey] || [];
    setIdentidadesPorArea({
      ...identidadesPorArea,
      [areaKey]: [...currentMetas, newMeta]
    });
    setHasChanges(true);
    
    // Agregar a las seleccionadas para tracking visual
    setSelectedSuggestions([...selectedSuggestions, suggestion]);
    
    // Mostrar notificación
    showToast('✅ Objetivo agregado exitosamente');

    // NO cerrar modal - permitir selección múltiple
    // setShowSuggestionsModal({ show: false, area: '', suggestions: [] });
  };

  const handleCloseQuantumModal = () => {
    setShowSuggestionsModal({ show: false, area: '', suggestions: [] });
    setSelectedSuggestions([]); // Reset tracking
  };

  // QUANTUM PASO 3: Función para obtener sugerencias de acciones
  const handleGetActionSuggestions = async (objetivo: string, objetoId: string, areaKey: string) => {
    setLoadingActionSuggestions(true);
    try {
      // Detectar timezone del usuario
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const response = await fetch('/api/quantum/sugerir-acciones', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-timezone': userTimezone
        },
        body: JSON.stringify({
          objetivo,
          area: areaKey
        })
      });

      if (!response.ok) throw new Error('Error obteniendo sugerencias de acciones');

      const data = await response.json();
      
      // Guardar sugerencias inline en lugar de modal
      setActionSuggestionsByObjetivo(prev => ({
        ...prev,
        [objetoId]: data.acciones || []
      }));
    } catch (error) {
      console.error('Error obteniendo sugerencias de acciones:', error);
      // No mostrar modal de error, solo log
    } finally {
      setLoadingActionSuggestions(false);
    }
  };

  // QUANTUM PASO 3: Función para seleccionar una acción sugerida inline
  const handleSelectActionSuggestionInline = async (suggestion: string, objetoId: string) => {
    const newMeta: Meta = {
      id: `${objetoId}-${Date.now()}`,
      description: suggestion,
      isValid: true
    };

    const currentMetas = metasPorArea[objetoId] || [];
    setMetasPorArea({
      ...metasPorArea,
      [objetoId]: [...currentMetas, newMeta]
    });
    setHasChanges(true);
    
    // Mostrar notificación
    showToast('✅ Acción agregada exitosamente');
    
    // Generar una nueva sugerencia para reemplazar la seleccionada
    const currentSuggestions = actionSuggestionsByObjetivo[objetoId] || [];
    const remainingSuggestions = currentSuggestions.filter(s => s !== suggestion);
    
    // Solicitar una nueva sugerencia
    try {
      const objetivo = getObjetivosFlattened().find(obj => obj.objetivo.id === objetoId);
      if (objetivo) {
        const response = await fetch('/api/chat-ia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Genera 1 acción SMART específica y medible para el objetivo: "${objetivo.objetivo.description}" en el área de ${objetivo.areaName}. 
            
Evita estas acciones ya sugeridas: ${currentSuggestions.join(', ')}

La acción debe:
- Ser específica y medible
- Incluir números o cantidades cuando sea posible
- Ser realizable en 3 meses
- Evitar lenguaje especulativo ("tratar", "intentar")

Responde SOLO con la acción, sin numeración ni explicaciones adicionales.`
          })
        });

        if (response.ok) {
          const data = await response.json();
          const newSuggestion = data.respuesta?.trim() || '';
          
          if (newSuggestion) {
            setActionSuggestionsByObjetivo(prev => ({
              ...prev,
              [objetoId]: [...remainingSuggestions, newSuggestion]
            }));
          } else {
            // Si no se generó nueva sugerencia, mantener solo las restantes
            setActionSuggestionsByObjetivo(prev => ({
              ...prev,
              [objetoId]: remainingSuggestions
            }));
          }
        } else {
          // Si falla la petición, mantener solo las restantes
          setActionSuggestionsByObjetivo(prev => ({
            ...prev,
            [objetoId]: remainingSuggestions
          }));
        }
      }
    } catch (error) {
      console.error('Error generando nueva sugerencia:', error);
      // En caso de error, mantener solo las restantes
      setActionSuggestionsByObjetivo(prev => ({
        ...prev,
        [objetoId]: remainingSuggestions
      }));
    }
  };

  // QUANTUM PASO 3: Función para seleccionar una acción sugerida (desde modal - mantener para compatibilidad)
  const handleSelectActionSuggestion = (suggestion: string, objetoId: string) => {
    // Verificar si ya fue seleccionada
    if (selectedActionSuggestions.includes(suggestion)) {
      return;
    }

    const newMeta: Meta = {
      id: `${objetoId}-${Date.now()}`,
      description: suggestion,
      isValid: true
    };

    const currentMetas = metasPorArea[objetoId] || [];
    setMetasPorArea({
      ...metasPorArea,
      [objetoId]: [...currentMetas, newMeta]
    });
    setHasChanges(true);
    
    // Agregar a las seleccionadas para tracking visual
    setSelectedActionSuggestions([...selectedActionSuggestions, suggestion]);
    
    // Mostrar notificación
    showToast('✅ Acción agregada exitosamente');
  };

  const handleCloseActionSuggestionsModal = () => {
    setShowActionSuggestionsModal({ show: false, objetivo: '', objetoId: '', suggestions: [] });
    setSelectedActionSuggestions([]);
  };

  const handleNextObjetivo = () => {
    if (currentObjetivoIndexStep3 < objetivosFlattened.length - 1) {
      setCurrentObjetivoIndexStep3(currentObjetivoIndexStep3 + 1);
    } else {
      // Si es el último objetivo, avanzar al Paso 4
      setCurrentStep(4);
      setCurrentObjetivoIndexStep3(0);
    }
  };

  const handlePrevObjetivo = () => {
    if (currentObjetivoIndexStep3 > 0) {
      setCurrentObjetivoIndexStep3(currentObjetivoIndexStep3 - 1);
    }
  };

  // ========== NAVEGACIÓN PASO 4 (ITERATIVA) - PLAN DE ACCIÓN ==========
  
  // Obtener lista plana de TODAS LAS ACCIONES del Paso 3 para configurar frecuencia
  const getAllMetasFlattened = (): { areaKey: string; areaName: string; areaEmoji: string; meta: Meta; objetivoDescription: string; index: number; total: number }[] => {
    const flattened: any[] = [];
    
    // Iterar sobre cada objetivo del Paso 2
    areasActivas.forEach(area => {
      const objetivos = identidadesPorArea[area.key] || [];
      
      objetivos.forEach((objetivo) => {
        // Para cada objetivo, obtener sus acciones del Paso 3
        const accionesPorObjetivo = metasPorArea[objetivo.id] || [];
        
        accionesPorObjetivo.forEach((accion) => {
          flattened.push({
            areaKey: area.key,
            areaName: area.name,
            areaEmoji: area.emoji,
            meta: accion, // La acción SMART que se va a configurar
            objetivoDescription: objetivo.description, // Para mostrar contexto
            index: flattened.length + 1,
            total: 0
          });
        });
      });
    });
    
    // Actualizar total
    flattened.forEach(item => item.total = flattened.length);
    return flattened;
  };

  const metasFlattened = getAllMetasFlattened();
  const currentMetaData = metasFlattened[currentMetaIndex];

  const handleSaveMetaConfig = (config: any) => {
    const newConfig: MetaConfig = {
      metaId: currentMetaData.meta.id,
      areaKey: currentMetaData.areaKey,
      description: currentMetaData.meta.description,
      config
    };

    setMetasConfiguradas([...metasConfiguradas.filter(mc => mc.metaId !== newConfig.metaId), newConfig]);
    setHasChanges(true);
    console.log('🔄 Cambio detectado en configuración de meta');
  };

  const handleNextMeta = () => {
    if (currentMetaIndex < metasFlattened.length - 1) {
      setCurrentMetaIndex(currentMetaIndex + 1);
    } else {
      // Si ya configuramos todas las metas, mostrar mensaje de éxito
      console.log('✅ Todas las metas configuradas');
      // Hacer scroll hacia arriba para ver el mensaje de progreso completo
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevMeta = () => {
    if (currentMetaIndex > 0) {
      setCurrentMetaIndex(currentMetaIndex - 1);
    }
  };

  // ========== SUBMIT ==========
  
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // 1. Guardar borrador en localStorage
      const draft = {
        declaracionesSer,
        identidadesPorArea,
        metasPorArea,
        metasConfiguradas,
        currentStep,
        currentMetaIndex,
        timestamp: new Date().toISOString()
      };
      const localStorageKey = `carta-wizard-draft-${userEmail}`;
      localStorage.setItem(localStorageKey, JSON.stringify(draft));
      
      // 2. Guardar declaraciones en CartaFrutos
      const cartaData: any = {};
      areasActivas.forEach(area => {
        const identidades = identidadesPorArea[area.key] || [];
        cartaData[`${area.key}Declaracion`] = identidades.length > 0 ? identidades[0].description : '';
      });
      
      await fetch('/api/carta/my-carta', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cartaData)
      });
      
      // 3. Obtener el ID de la carta
      const getRes = await fetch('/api/carta/my-carta');
      const getData = await getRes.json();
      
      if (!getData.carta?.id) {
        throw new Error('No se pudo obtener el ID de la carta');
      }
      
      const cartaId = getData.carta.id;
      console.log('📤 Carta ID:', cartaId);
      
      // 4. Guardar todas las metas y acciones configuradas
      console.log('💾 Guardando', metasConfiguradas.length, 'metas con sus acciones...');
      
      for (let i = 0; i < metasConfiguradas.length; i++) {
        const metaConfig = metasConfiguradas[i];
        const metaData = metasFlattened.find(m => m.meta.id === metaConfig.metaId);
        
        if (!metaData) {
          console.error('❌ No se encontró metaData para metaConfig:', metaConfig.metaId);
          continue;
        }
        
        // Guardar la meta principal
        const metaRes = await fetch('/api/carta/save-meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartaId,
            categoria: metaData.areaKey, // Usar el areaKey correcto del metaData
            orden: i + 1,
            metaPrincipal: metaConfig.description,
            declaracionPoder: identidadesPorArea[metaData.areaKey]?.[0]?.description || ''
          })
        });
        
        const metaResData = await metaRes.json();
        if (!metaResData.meta?.id) {
          console.error('❌ Error guardando meta:', metaConfig, metaResData);
          continue;
        }
        
        const savedMetaId = metaResData.meta.id;
        console.log('✅ Meta guardada ID:', savedMetaId, '-', metaConfig.description.substring(0, 50));
        
        // Guardar la acción de esta meta (cada meta tiene solo una acción en el nuevo sistema)
        console.log('🔍 Guardando acción para meta:', metaConfig);
        console.log('📋 Config de frecuencia:', metaConfig.config);
        
        // Convertir la frecuencia del config al formato que espera la base de datos
        let frequency = 'WEEKLY';
        let assignedDays: number[] = [];
        
        if (metaConfig.config?.type === 'DAILY') {
          frequency = 'DAILY';
          assignedDays = [0, 1, 2, 3, 4, 5, 6]; // Todos los días
        } else if (metaConfig.config?.type === 'WEEKLY' && metaConfig.config?.selectedDays) {
          frequency = 'WEEKLY';
          assignedDays = metaConfig.config.selectedDays;
        } else if (metaConfig.config?.type === 'MONTHLY') {
          frequency = 'MONTHLY';
          assignedDays = metaConfig.config?.monthDays || [];
        } else if (metaConfig.config?.type === 'ONE_TIME') {
          frequency = 'ONE_TIME';
          assignedDays = [];
        }
        
        console.log('📅 DEBUG - Guardando acción ONE_TIME:', {
          tipo: metaConfig.config?.type,
          specificDate: metaConfig.config?.specificDate,
          deadline: metaConfig.config?.deadline,
          enviaremos: metaConfig.config?.type === 'ONE_TIME' ? (metaConfig.config?.specificDate || metaConfig.config?.deadline) : null
        });
        
        const accionRes = await fetch('/api/carta/save-accion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metaId: savedMetaId,
            texto: metaConfig.description, // La descripción de la acción
            frequency: frequency,
            assignedDays: assignedDays,
            requiereEvidencia: frequency === 'DAILY',
            specificDate: metaConfig.config?.type === 'ONE_TIME' ? (metaConfig.config?.specificDate || metaConfig.config?.deadline) : null
          })
        });
        
        if (accionRes.ok) {
          console.log('✅ Acción guardada para meta', savedMetaId);
        } else {
          console.error('❌ Error guardando acción:', await accionRes.text());
        }
      }
      
      console.log('✅ Todas las metas y acciones guardadas');
      
      // 5. Enviar a revisión
      console.log('📤 Enviando carta para revisión...');
      const submitRes = await fetch('/api/carta/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartaId })
      });

      const submitData = await submitRes.json();
      
      if (submitRes.ok) {
        // Actualizar estado local
        const newStatus = submitData.carta?.estado || 'PENDIENTE_MENTOR';
        setEstado(newStatus);
        
        // Resetear detección de cambios después de enviar exitosamente
        setHasChanges(false);
        
        // Actualizar snapshot original con los datos actuales
        setOriginalData({
          identidadesPorArea: JSON.parse(JSON.stringify(identidadesPorArea)),
          metasPorArea: JSON.parse(JSON.stringify(metasPorArea)),
          metasConfiguradas: JSON.parse(JSON.stringify(metasConfiguradas))
        });
        
        console.log('✅ Carta enviada exitosamente para revisión');
        
        setErrorModal({
          show: true,
          title: '✅ ¡Carta Enviada!',
          message: submitData.message || 'Tu carta ha sido enviada para revisión.'
        });
        
        setTimeout(() => {
          window.location.href = '/dashboard/carta/resumen';
        }, 2000);
      } else {
        // eslint-disable-next-line no-console
        console.error('❌ Error del servidor:', submitData);
        setErrorModal({
          show: true,
          title: '❌ Error al enviar',
          message: submitData.message || submitData.error || 'Hubo un problema al enviar tu carta. Por favor intenta nuevamente.'
        });
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('❌ Error submitting:', error);
      setErrorModal({
        show: true,
        title: '❌ Error de conexión',
        message: error.message || 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1015] pb-20">
      {/* Toast de notificación */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[200] animate-in slide-in-from-top-5">
          <div className="bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border-2 border-green-400/50">
            <div className="text-2xl">✅</div>
            <p className="font-medium">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-purple-500/30 sticky top-0 z-50 backdrop-blur-lg">
        <div className="max-w-5xl mx-auto p-4">
          {/* Alerta de solo lectura */}
          {isReadOnly && (
            <div className="mb-4 bg-green-900/30 border border-green-500/50 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="text-green-400" size={24} />
              <div>
                <h3 className="text-green-400 font-bold text-sm">✅ Tu carta ha sido autorizada</h3>
                <p className="text-green-300/80 text-xs">Esta carta está en modo solo lectura. No se permiten más cambios.</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-purple-400" />
                F.R.U.T.O.S. 2.0
              </h1>
              <p className="text-sm text-gray-400">Múltiples acciones por área · Configuración individual</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Botón configurar áreas (solo si NO pertenece a grupo y está en BORRADOR) */}
              {!perteneceAGrupo && estado === 'BORRADOR' && (
                <button
                  onClick={() => setShowAreaConfig(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition"
                  title="Configurar áreas personalizadas"
                >
                  <Settings size={16} />
                  Áreas ({areasActivas.length})
                </button>
              )}
              
              {/* Botón para limpiar localStorage (solo en desarrollo) */}
              {estado === 'BORRADOR' && (
                <button
                  onClick={() => {
                    setErrorModal({
                      show: true,
                      title: '🗑️ Limpiar Borrador Local',
                      message: '¿Estás seguro de que deseas limpiar el borrador guardado en tu navegador?\n\n⚠️ Esto eliminará TODO el progreso guardado localmente.\n\n✅ La base de datos NO será afectada.\n\nSi tienes datos guardados en el servidor, podrás recuperarlos recargando la página después de limpiar.'
                    });
                  }}
                  className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg border border-red-500/30 flex items-center gap-1.5"
                  title="Limpiar borrador del navegador"
                >
                  🗑️ Limpiar Borrador
                </button>
              )}
              
              <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${
                estado === 'APROBADA' ? 'bg-green-500/20 text-green-400' :
                estado === 'CAMBIOS_SOLICITADOS' ? 'bg-orange-500/20 text-orange-400' :
                estado === 'PENDIENTE_MENTOR' || estado === 'PENDIENTE_ADMIN' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {estado === 'APROBADA' && <Check size={16} />}
                {estado === 'CAMBIOS_SOLICITADOS' && <AlertCircle size={16} />}
                {estado}
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {WIZARD_STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => {
                    if (step.id <= currentStep) setCurrentStep(step.id);
                  }}
                  disabled={step.id > currentStep}
                  className={`flex items-center gap-2 p-3 rounded-xl flex-1 transition-all ${
                    currentStep === step.id 
                      ? 'bg-purple-600 text-white' 
                      : currentStep > step.id
                      ? 'bg-green-600/20 text-green-400 cursor-pointer'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <span className="text-2xl">{step.emoji}</span>
                  <div className="text-left">
                    <div className="text-xs font-bold">{step.title}</div>
                    <div className="text-xs opacity-75">{step.subtitle}</div>
                  </div>
                  {currentStep > step.id && <Check size={16} className="ml-auto" />}
                </button>
                {idx < WIZARD_STEPS.length - 1 && (
                  <ChevronRight className="text-gray-600 mx-1" size={20} />
                )}
              </div>
            ))}
          </div>

          {saving && (
            <div className="mt-2 text-xs text-purple-400 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              Guardando...
            </div>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto p-6">
        {/* Paso 1: Declaración del Ser (NUEVO) */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <div className="text-4xl">🧘</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">Antes de definir qué quieres tener, define quién quieres ser</h3>
                  <p className="text-sm text-purple-200 mb-4">
                    <strong>💡 Instrucción:</strong> Escribe en presente quién te comprometes ser para alcanzar tus metas. Todas las declaraciones DEBEN comenzar con <span className="text-purple-300 font-bold">"Yo soy" + manera de SER</span>.
                  </p>
                  
                  {/* Botón Quantum Coach */}
                  <button
                    onClick={() => setShowQuantumModal(true)}
                    disabled={isReadOnly}
                    className="relative bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 
                             disabled:from-slate-700 disabled:to-slate-700 text-white px-5 py-3 rounded-xl font-bold 
                             transition-all flex items-center gap-3 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/60 
                             hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                             border-2 border-cyan-400/30 font-mono tracking-wide overflow-hidden group"
                  >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Animated orb */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-cyan-300 rounded-full blur-md opacity-50 animate-pulse"></div>
                      <Atom size={22} className="relative text-white animate-spin" style={{ animationDuration: '8s' }} />
                    </div>
                    
                    <span className="relative">✨ ¿No sabes que escribir? Invoca a QUANTUM</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal de Quantum Coach */}
            <QuantumCoachModal
              isOpen={showQuantumModal}
              onClose={() => setShowQuantumModal(false)}
              onComplete={(declaraciones) => {
                setDeclaracionesSer(prev => ({ ...prev, ...declaraciones }));
                setHasChanges(true);
                // Mostrar notificación de éxito
                setShowQuantumSuccessNotification(true);
                setTimeout(() => setShowQuantumSuccessNotification(false), 5000);
              }}
              currentDeclaraciones={declaracionesSer}
              perteneceAGrupo={perteneceAGrupo}
              areasActivas={areasActivas}
            />

            {/* Notificación de éxito de Quantum */}
            {showQuantumSuccessNotification && (
              <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
                <div className="bg-gradient-to-r from-cyan-900/95 to-blue-900/95 backdrop-blur-xl border-2 border-cyan-500/50 rounded-2xl p-6 shadow-2xl max-w-md">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-cyan-400 rounded-full blur-lg opacity-50 animate-pulse"></div>
                      <div className="relative w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                        <Atom size={24} className="text-white animate-spin" style={{ animationDuration: '3s' }} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
                        <Sparkles size={18} className="text-cyan-300" />
                        ¡Declaraciones actualizadas!
                      </h4>
                      <p className="text-cyan-100 text-sm leading-relaxed">
                        QUANTUM ha optimizado tus declaraciones del ser para maximizar tu impacto y claridad.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowQuantumSuccessNotification(false)}
                      className="text-cyan-300 hover:text-white transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {areasActivas.map((area) => {
              const fieldValue = declaracionesSer[area.key] || '';
              const isValid = validateYoSoy(fieldValue);
              const showValidation = fieldValue.trim().length > 0;
              
              return (
                <div key={area.key} className="bg-[#1a1b1f] border-2 border-gray-800 rounded-xl p-5 hover:border-purple-500/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">{area.emoji}</div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold">{area.name}</h3>
                      {showValidation && isValid && (
                        <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                          <Check size={12} />
                          Declaración válida
                        </p>
                      )}
                      {showValidation && !isValid && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          Tu declaración del ser debe comenzar con "Yo soy"
                        </p>
                      )}
                    </div>
                    {showValidation && isValid && (
                      <div className="bg-green-500/20 text-green-400 w-8 h-8 rounded-full flex items-center justify-center">
                        <Check size={16} />
                      </div>
                    )}
                  </div>

                  <textarea
                    value={fieldValue}
                    onChange={(e) => {
                      if (!isReadOnly) {
                        setDeclaracionesSer({ ...declaracionesSer, [area.key]: e.target.value });
                        setHasChanges(true);
                        console.log('🔄 Cambio detectado en declaración del ser:', area.key);
                      }
                    }}
                    placeholder={`Yo soy ${area.name.toLowerCase()}...`}
                    disabled={isReadOnly}
                    className={`w-full bg-gray-900 text-white p-4 rounded-lg resize-none focus:ring-2 transition-all ${
                      isReadOnly ? 'opacity-70 cursor-not-allowed bg-gray-800' :
                      showValidation && !isValid ? 'border-2 border-red-500 focus:ring-red-500' :
                      showValidation && isValid ? 'border-2 border-green-500 focus:ring-green-500' :
                      'border border-gray-700 focus:ring-purple-500'
                    }`}
                    rows={3}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Paso 2: Identidades (Múltiples) */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Sugerencia Inteligente del Coach */}
            {showSmartSuggestion && (
              <div className="bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-purple-500/20 border-2 border-purple-500/50 rounded-xl p-4 animate-in slide-in-from-top-5 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">🤖</div>
                  <div className="flex-1">
                    <h4 className="text-purple-300 font-bold text-sm uppercase mb-1">
                      💡 Asistente Inteligente
                    </h4>
                    <p className="text-white text-sm leading-relaxed">
                      {showSmartSuggestion}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSmartSuggestion(null)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 border border-purple-500/30 rounded-xl p-6 mb-6">
              <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                Definición del Objetivo
              </h3>
              <p className="text-sm text-purple-200 mb-4">
                <strong>Usa la Fórmula de Poder:</strong> Verbo de Acción + Resultado Exacto (Cantidad/Número/Métrica)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 text-xl">❌</span>
                    <div>
                      <p className="text-red-300 font-bold mb-1">Incorrecto:</p>
                      <p className="text-gray-300 italic">"Ahorrar dinero"</p>
                      <p className="text-xs text-gray-400 mt-1">Muy vago, sin medición</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-green-400 text-xl">✅</span>
                    <div>
                      <p className="text-green-300 font-bold mb-1">Correcto:</p>
                      <p className="text-gray-300 italic">"Ahorrar $50,000 en mi cuenta de inversión"</p>
                      <p className="text-xs text-gray-400 mt-1">Específico y medible (fechas en Paso 4)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {areasActivas.map((area) => (
              <div key={area.key} className="bg-[#1a1b1f] border-2 border-gray-800 rounded-xl p-6">
                {/* Botón de sugerencias QUANTUM */}
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span className="text-2xl">{area.emoji}</span>
                    {area.name}
                  </h3>
                  {!isReadOnly && (
                    <button
                      onClick={() => handleGetSuggestions(area.key)}
                      disabled={loadingSuggestions === area.key}
                      className="group relative px-4 py-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/40 hover:to-blue-600/40 border border-purple-500/50 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {loadingSuggestions === area.key ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                            <span className="text-purple-300">Generando ideas...</span>
                          </>
                        ) : (
                          <>
                            <Atom className="w-4 h-4 text-purple-400 group-hover:rotate-180 transition-transform duration-500" />
                            <span className="text-purple-300">💡 Sugerir logros con QUANTUM</span>
                          </>
                        )}
                      </div>
                    </button>
                  )}
                </div>

                <MetaInputDynamic
                  areaKey={area.key}
                  areaName={area.name}
                  areaEmoji={area.emoji}
                  metas={identidadesPorArea[area.key] || []}
                  onMetasChange={(newMetas) => {
                    if (!isReadOnly) {
                      setIdentidadesPorArea({ ...identidadesPorArea, [area.key]: newMetas });
                      setHasChanges(true);
                      
                      // AUTOCOMPLETADO INTELIGENTE: Analizar nueva meta
                      if (newMetas.length > (identidadesPorArea[area.key]?.length || 0)) {
                        const lastMeta = newMetas[newMetas.length - 1];
                        const extracted = extractSmartInfo(lastMeta.description);
                        
                        // Guardar info extraída
                        setExtractedInfoByMeta(prev => ({
                          ...prev,
                          [lastMeta.id]: extracted
                        }));
                        
                        // Mostrar sugerencia si tiene confianza alta
                        if (extracted.confidence >= 70 && extracted.suggestion) {
                          setShowSmartSuggestion(extracted.suggestion);
                          setTimeout(() => setShowSmartSuggestion(null), 6000); // Ocultar después de 6 seg
                        }
                      }
                      
                      console.log('🔄 Cambio detectado en identidades:', area.key);
                    }
                  }}
                  placeholder="Ej: Incrementar mis ingresos mensuales en un 30%"
                  maxMetas={5}
                  isReadOnly={isReadOnly}
                  validateFunction={(text) => {
                    // Rule A: Min 15 chars
                    if (text.length < 15) return false;
                    
                    // Rule B: COACH ANTI-EXCUSAS - Diccionario completo de palabras débiles
                    const weakWords = [
                      'tratar', 'intento', 'intentar',
                      'espero', 'esperar', 'ojalá',
                      'quisiera', 'gustaría', 'desearía',
                      'creo', 'tal vez', 'quizás', 'quizá', 'posible',
                      'poco', 'algo', 'más o menos'
                    ];
                    if (weakWords.some(word => text.toLowerCase().includes(word))) return false;
                    
                    // Rule C: Min 3 words
                    if (text.trim().split(/\s+/).length < 3) return false;
                    
                    return true;
                  }}
                  errorMessage="Tu objetivo debe ser específico y poderoso"
                  customValidationMessages={{
                    tooShort: "Tu objetivo es muy corto. Sé más específico sobre qué quieres lograr (mínimo 15 caracteres).",
                    weakWords: "Evita palabras como 'tratar' o 'intentar'. Escribe como un hecho: 'Voy a lograr X antes de Y...'",
                    tooFewWords: "Tu objetivo necesita más detalle. Incluye al menos 3 palabras que describan qué quieres lograr."
                  }}
                  label="Objetivo"
                />
              </div>
            ))}
          </div>
        )}

        {/* Paso 3: Metas Dinámicas - ITERATIVO POR OBJETIVO */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {objetivosFlattened.length === 0 ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
                <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
                <p className="text-red-400 font-bold mb-2">Sin objetivos definidos</p>
                <p className="text-gray-300 text-sm">Regresa al Paso 2 para agregar al menos un objetivo por área</p>
              </div>
            ) : currentObjetivoData ? (
              <>
                {/* Header con info del objetivo actual */}
                <div className="bg-gradient-to-r from-purple-900/40 via-pink-900/40 to-purple-900/40 border-2 border-purple-500/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{currentObjetivoData.areaEmoji}</span>
                      <div>
                        <h3 className="text-xl font-bold text-white">{currentObjetivoData.areaName}</h3>
                        <p className="text-sm text-purple-300">
                          Objetivo {currentObjetivoData.index} de {currentObjetivoData.total}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl mb-1">🎯</div>
                      <p className="text-xs text-gray-400">Definir acciones</p>
                    </div>
                  </div>
                  
                  {/* Mostrar el objetivo actual */}
                  <div className="bg-black/30 rounded-lg p-4 border border-purple-500/30">
                    <p className="text-xs text-purple-300 mb-1">TU OBJETIVO:</p>
                    <p className="text-lg text-white font-medium">{currentObjetivoData.objetivo.description}</p>
                  </div>
                </div>

                {/* Instrucciones */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                  <p className="text-sm text-blue-200 mb-2">
                    <strong>🎯 Acciones SMART:</strong> Selecciona de las sugerencias o escribe tus propias acciones.
                  </p>
                  <div className="text-xs text-blue-300 space-y-1">
                    <div>✅ Cada acción debe ser medible (incluye números/cantidades)</div>
                    <div>✅ Puedes agregar múltiples acciones para un mismo objetivo</div>
                    <div>🚫 Sin lenguaje especulativo ("tratar", "intentar", etc.)</div>
                  </div>
                </div>

                {/* Sugerencias QUANTUM inline */}
                {!isReadOnly && (
                  <div className="mb-4">
                    {loadingActionSuggestions ? (
                      <div className="bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-purple-900/20 border border-purple-500/40 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <Atom className="w-6 h-6 text-purple-400 animate-spin" style={{ animationDuration: '2s' }} />
                          <div>
                            <p className="text-purple-300 font-medium text-sm">QUANTUM generando posibilidades de acción...</p>
                          </div>
                        </div>
                      </div>
                    ) : actionSuggestionsByObjetivo[currentObjetivoData.objetivo.id]?.length > 0 ? (
                      <div className="bg-gradient-to-r from-purple-900/10 via-blue-900/10 to-purple-900/10 border border-purple-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Atom className="w-5 h-5 text-purple-400" />
                          <h4 className="text-purple-300 font-bold text-sm">💡 Sugerencias de QUANTUM</h4>
                        </div>
                        
                        <div className="space-y-2">
                          {actionSuggestionsByObjetivo[currentObjetivoData.objetivo.id].map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => handleSelectActionSuggestionInline(suggestion, currentObjetivoData.objetivo.id)}
                              className="group w-full text-left bg-gray-800/50 hover:bg-purple-600/20 border border-gray-700 hover:border-purple-500/50 rounded-lg p-3 transition-all duration-200 hover:scale-[1.01]"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs group-hover:scale-110 transition-transform">
                                  {index + 1}
                                </div>
                                <p className="text-white text-sm leading-snug group-hover:text-purple-200 transition-colors flex-1">
                                  {suggestion}
                                </p>
                                <ChevronRight className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Input de metas para este objetivo */}
                <div className="bg-[#1a1b1f] border-2 border-gray-800 rounded-xl p-6">
                  <MetaInputDynamic
                    key={currentObjetivoData.objetivo.id} // IMPORTANTE: Key único por objetivo
                    areaKey={currentObjetivoData.objetivo.id} // Usar ID del objetivo como key única
                    areaName={`${currentObjetivoData.areaName} - Objetivo ${currentObjetivoData.index}`}
                    areaEmoji={currentObjetivoData.areaEmoji}
                    metas={metasPorArea[currentObjetivoData.objetivo.id] || []} // Usar metas (controlled)
                    onMetasChange={(metas) => {
                      const previousMetas = metasPorArea[currentObjetivoData.objetivo.id] || [];
                      setMetasPorArea({ ...metasPorArea, [currentObjetivoData.objetivo.id]: metas });
                      setHasChanges(true);
                      
                      // NUEVO: Analizar automáticamente cada nueva acción
                      if (metas.length > previousMetas.length) {
                        const nuevaAccion = metas[metas.length - 1];
                        const extracted = extractSmartInfo(nuevaAccion.description);
                        
                        // Guardar análisis para esta acción
                        setExtractedInfoByMeta(prev => ({
                          ...prev,
                          [nuevaAccion.id]: extracted
                        }));
                        
                        console.log('🤖 ACCIÓN MANUAL ANALIZADA:', {
                          accionId: nuevaAccion.id,
                          descripcion: nuevaAccion.description,
                          extracted
                        });
                      }
                      
                      console.log('🔄 Acciones actualizadas para objetivo:', currentObjetivoData.objetivo.id);
                    }}
                    disabled={estado === 'APROBADA'}
                    placeholder="Ej: Ahorrar $5,000 mensuales en cuenta de inversión"
                    label="Acción SMART"
                  />
                </div>

                {/* Navegación entre objetivos */}
                <div className="flex items-center justify-between gap-4 pt-4">
                  <button
                    onClick={handlePrevObjetivo}
                    disabled={currentObjetivoIndexStep3 === 0}
                    className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={20} />
                    Objetivo Anterior
                  </button>

                  <div className="text-center flex-1">
                    <p className="text-sm text-gray-400 mb-2">
                      Progreso: {currentObjetivoData.index} de {currentObjetivoData.total} objetivos
                    </p>
                    <div className="flex gap-1 justify-center">
                      {objetivosFlattened.map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-2 w-8 rounded-full transition-all ${
                            idx === currentObjetivoIndexStep3 ? 'bg-purple-500' : 'bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleNextObjetivo}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all"
                  >
                    {currentObjetivoIndexStep3 < objetivosFlattened.length - 1 ? (
                      <>
                        Siguiente Objetivo
                        <ChevronRight size={20} />
                      </>
                    ) : (
                      <>
                        Continuar al Paso 4
                        <ChevronRight size={20} />
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Paso 4: Configuración Iterativa */}
        {currentStep === 4 && (
          <div>
            {metasFlattened.length === 0 ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
                <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
                <p className="text-red-400 font-bold mb-2">Sin acciones definidas</p>
                <p className="text-gray-300 text-sm">Regresa al Paso 3 para agregar acciones SMART a tus objetivos</p>
              </div>
            ) : (
              <>
                {currentMetaData && (
                  <>
                    {/* Header mostrando contexto del objetivo */}
                    <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-pink-900/40 border-2 border-indigo-500/50 rounded-xl p-4 mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{currentMetaData.areaEmoji}</span>
                        <div className="flex-1">
                          <p className="text-xs text-indigo-300">OBJETIVO:</p>
                          <p className="text-sm text-white font-medium">{currentMetaData.objetivoDescription}</p>
                        </div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-3 border border-indigo-500/30">
                        <p className="text-xs text-purple-300 mb-1">ACCIÓN A CONFIGURAR:</p>
                        <p className="text-base text-white font-bold">{currentMetaData.meta.description}</p>
                      </div>
                    </div>

                    {/* DEBUG: Logging antes de renderizar ConfiguradorAccionIterativo */}
                    {console.log('📊 PASO 4 - Renderizando acción:', {
                      metaId: currentMetaData.meta.id,
                      metaDescription: currentMetaData.meta.description,
                      extractedInfoDisponible: extractedInfoByMeta[currentMetaData.meta.id],
                      todosExtracted: Object.keys(extractedInfoByMeta)
                    })}

                    <ConfiguradorAccionIterativo
                      key={currentMetaData.meta.id}
                      metaDescription={currentMetaData.meta.description}
                      metaIndex={currentMetaData.index}
                      totalMetas={currentMetaData.total}
                      areaName={currentMetaData.areaName}
                      areaEmoji={currentMetaData.areaEmoji}
                      initialConfig={metasConfiguradas.find(mc => mc.metaId === currentMetaData.meta.id)?.config}
                      suggestedConfig={extractedInfoByMeta[currentMetaData.meta.id] ? {
                        frequency: extractedInfoByMeta[currentMetaData.meta.id].frequency || undefined,
                        days: extractedInfoByMeta[currentMetaData.meta.id].detectedDays,
                        date: extractedInfoByMeta[currentMetaData.meta.id].detectedDate,
                        confidence: extractedInfoByMeta[currentMetaData.meta.id].confidence,
                        suggestion: extractedInfoByMeta[currentMetaData.meta.id].suggestion
                      } : undefined}
                      onSave={handleSaveMetaConfig}
                      onNext={handleNextMeta}
                      onPrev={currentMetaIndex > 0 ? handlePrevMeta : undefined}
                    />
                  </>
                )}

                {/* Progreso global */}
                <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Progreso global</span>
                    <span className="text-sm font-bold text-purple-300">
                      {metasConfiguradas.length} de {metasFlattened.length} {metasConfiguradas.length < metasFlattened.length ? 'por configurar' : 'configuradas'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all"
                      style={{ width: `${(metasConfiguradas.length / metasFlattened.length) * 100}%` }}
                    />
                  </div>
                  {metasConfiguradas.length < metasFlattened.length && (
                    <p className="text-xs text-yellow-400 mt-2">
                      ⚠️ Faltan {metasFlattened.length - metasConfiguradas.length} acciones por configurar. Navega con las flechas para completarlas.
                    </p>
                  )}
                </div>

                {/* Mensaje de éxito cuando todas las metas están configuradas */}
                {metasConfiguradas.length === metasFlattened.length && (
                  <div className="mt-6 bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-2 border-green-500/50 rounded-xl p-6 animate-in slide-in-from-bottom-4">
                    <div className="flex items-start gap-4">
                      <div className="text-5xl">🎉</div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-xl mb-2">¡Felicidades! Todas las acciones están configuradas</h3>
                        <p className="text-green-200 text-sm mb-4">
                          Has completado la configuración de todas tus metas y acciones. Ahora puedes enviar tu Carta F.R.U.T.O.S. para iniciar tu transformación.
                        </p>
                        <div className="bg-black/30 rounded-lg p-4 mb-4">
                          <p className="text-gray-300 text-sm">
                            📊 <strong>Resumen:</strong> {metasFlattened.length} acciones configuradas en {areasActivas.length} áreas de vida
                          </p>
                        </div>
                        <button
                          onClick={handleSubmit}
                          disabled={submitting || !canSubmit()}
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105"
                        >
                          {submitting ? (
                            <>
                              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Enviando esto puedo tomar unos minutos...
                            </>
                          ) : (
                            <>
                              <Send size={20} />
                              {estado === 'BORRADOR' ? 'Enviar Carta F.R.U.T.O.S. 2.0 →' : 'Actualizar Carta →'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* NAVIGATION FOOTER */}
      {!isReadOnly && currentStep !== 3 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#1a1b1f] border-t border-gray-800 p-4 z-50">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              if (currentStep === 4 && currentMetaIndex > 0) {
                handlePrevMeta();
              } else if (currentStep === 4) {
                // Si estamos en Paso 4 y es la primera meta, regresar al Paso 3
                setCurrentStep(3);
                setCurrentObjetivoIndexStep3(objetivosFlattened.length - 1); // Ir al último objetivo
              } else if (currentStep > 1) {
                setCurrentStep(currentStep - 1);
                setCurrentMetaIndex(0);
              }
            }}
            disabled={currentStep === 1}
            className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={20} />
            Anterior
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              {currentStep < 4 ? `Paso ${currentStep} de 4` : `Meta ${currentMetaIndex + 1} de ${metasFlattened.length}`}
            </p>
            <div className="flex gap-2 justify-center mt-2">
              <div className={`w-2 h-2 rounded-full ${validateStep1() ? 'bg-green-500' : 'bg-gray-600'}`} />
              <div className={`w-2 h-2 rounded-full ${validateStep2() ? 'bg-green-500' : 'bg-gray-600'}`} />
              <div className={`w-2 h-2 rounded-full ${validateStep3() ? 'bg-green-500' : 'bg-gray-600'}`} />
              <div className={`w-2 h-2 rounded-full ${validateStep4() ? 'bg-green-500' : 'bg-gray-600'}`} />
            </div>
          </div>

          {/* Botón de navegación principal */}
          {currentStep < 4 ? (
            <button
              onClick={() => {
                if (currentStep === 1 && !canAdvanceToStep2()) {
                  alert('⚠️ Completa todas las declaraciones del ser con "Yo Soy" antes de continuar.');
                  return;
                }
                if (currentStep === 2 && !canAdvanceToStep3()) {
                  alert('⚠️ Agrega al menos un objetivo válido por cada área antes de continuar.');
                  return;
                }
                setCurrentStep(currentStep + 1);
                setCurrentMetaIndex(0);
              }}
              disabled={(currentStep === 1 && !canAdvanceToStep2()) || (currentStep === 2 && !canAdvanceToStep3()) || (currentStep === 3 && !canAdvanceToStep4())}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Siguiente
              <ChevronRight size={20} />
            </button>
          ) : (
            // En el paso 4, solo mostrar "Enviar" cuando TODAS las metas estén configuradas
            <div className="flex items-center gap-3">
              {/* Lógica de habilitación del botón:
                  - Debe pasar TODAS las validaciones (canSubmit)
                  - Si estado es BORRADOR: Habilitado solo si canSubmit()
                  - Si estado es EN_REVISION: Solo habilitado si hasChanges Y canSubmit()
              */}
              {(() => {
                const allStepsValid = canSubmit();
                const shouldEnable = allStepsValid && (estado === 'BORRADOR' || hasChanges);
                const buttonOpacity = shouldEnable ? '' : 'opacity-50 cursor-not-allowed';
                
                // Usar metasFlattened.length que es la fuente de verdad
                const totalAcciones = metasFlattened.length;
                
                // Debug log detallado
                console.log('🔘 Validación del botón Enviar:', {
                  step1: validateStep1(),
                  step2: validateStep2(),
                  step3: validateStep3(),
                  step4: validateStep4(),
                  allStepsValid,
                  metasConfiguradas: metasConfiguradas.length,
                  totalAcciones,
                  metasFlattened: metasFlattened.length,
                  estado,
                  hasChanges,
                  shouldEnable
                });
                
                return (
                  <>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !shouldEnable}
                      className={`px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:scale-105 disabled:cursor-not-allowed transition-all ${buttonOpacity}`}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Por favor espere...
                        </>
                      ) : (
                        <>
                          <Check size={20} />
                          {estado === 'BORRADOR' ? 'Enviar para Revisión' : 'Reenviar Cambios'}
                        </>
                      )}
                    </button>
                    
                    {/* Indicador visual de validación */}
                    {!allStepsValid && (
                      <div className="text-xs text-yellow-400 max-w-xs">
                        ⚠️ Completa todos los pasos:
                        {!validateStep1() && <div>• Paso 1: Declaraciones del Ser</div>}
                        {!validateStep2() && <div>• Paso 2: Objetivos</div>}
                        {!validateStep3() && <div>• Paso 3: Acciones SMART</div>}
                        {!validateStep4() && <div>• Paso 4: Plan de Acción ({metasConfiguradas.length}/{totalAcciones})</div>}
                      </div>
                    )}
                    {allStepsValid && estado !== 'BORRADOR' && !hasChanges && (
                      <p className="text-xs text-gray-500 max-w-xs">
                        ℹ️ Realiza cambios para habilitar el reenvío
                      </p>
                    )}
                  </>
                );
              })()}
              
              {/* Mostrar estado de progreso mientras se configuran las metas */}
              {!validateStep3() && (
                <div className="px-6 py-3 bg-gray-800/50 border border-gray-700 text-gray-400 rounded-xl font-bold flex items-center gap-2">
                  <AlertCircle size={20} />
                  Configura todas las metas ({metasConfiguradas.length}/{metasFlattened.length})
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* MODAL DE ERROR/ÉXITO MEJORADO */}
      {errorModal.show && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-purple-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center gap-4">
              <div className={`text-6xl ${errorModal.title.includes('✅') ? 'animate-bounce' : 'animate-pulse'}`}>
                {errorModal.title.includes('🗑️') ? '🗑️' : errorModal.title.includes('✅') ? '🎉' : '⚠️'}
              </div>
              <h3 className="text-2xl font-bold text-white">
                {errorModal.title}
              </h3>
              <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                {errorModal.message}
              </p>
              
              {/* Botones especiales para confirmación de limpiar borrador */}
              {errorModal.title.includes('🗑️') ? (
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => setErrorModal({ show: false, title: '', message: '' })}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const localStorageKey = `carta-wizard-draft-${userEmail}`;
                      localStorage.removeItem(localStorageKey);
                      localStorage.removeItem('carta-wizard-draft');
                      setErrorModal({ show: false, title: '', message: '' });
                      window.location.reload();
                    }}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:shadow-lg hover:scale-105 text-white font-bold py-3 px-6 rounded-xl transition-all"
                  >
                    Sí, Limpiar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setErrorModal({ show: false, title: '', message: '' })}
                  className="mt-4 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:scale-105 text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL CONFIGURADOR DE ÁREAS */}
      {showAreaConfig && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in overflow-y-auto">
          <div className="max-w-4xl w-full my-8">
            <AreaConfigurator onClose={() => setShowAreaConfig(false)} />
          </div>
        </div>
      )}

      {/* MODAL DE SUGERENCIAS QUANTUM */}
      {showSuggestionsModal.show && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border-2 border-purple-500/50 rounded-2xl max-w-3xl w-full p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Atom className="w-10 h-10 text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
                  <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">QUANTUM Estratega</h3>
                  <p className="text-purple-300 text-sm">Objetivos de Alto Impacto - {AREAS.find(a => a.key === showSuggestionsModal.area)?.name}</p>
                </div>
              </div>
              <button
                onClick={handleCloseQuantumModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <span className="text-2xl">✕</span>
              </button>
            </div>

            {/* Instrucciones */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
              <p className="text-blue-200 text-sm">
                💡 <strong>Selecciona uno o varios objetivos</strong> que resuenen contigo. Enfócate en el resultado medible. <strong>Las fechas las definirás después.</strong>
              </p>
            </div>

            {/* Lista de Sugerencias */}
            <div className="space-y-3 mb-6">
              {showSuggestionsModal.suggestions.map((suggestion, index) => {
                const isSelected = selectedSuggestions.includes(suggestion);
                return (
                  <button
                    key={index}
                    onClick={() => handleSelectSuggestion(suggestion, showSuggestionsModal.area)}
                    disabled={isSelected}
                    className={`group w-full text-left transition-all duration-300 rounded-xl p-4 border-2 ${
                      isSelected
                        ? 'bg-gradient-to-r from-green-600/30 to-green-600/20 border-green-500/50 cursor-not-allowed'
                        : 'bg-gradient-to-r from-gray-800 to-gray-800/50 hover:from-purple-600/20 hover:to-blue-600/20 border-gray-700 hover:border-purple-500/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm transition-transform ${
                        isSelected
                          ? 'bg-green-500'
                          : 'bg-gradient-to-br from-purple-500 to-blue-500 group-hover:scale-110'
                      }`}>
                        {isSelected ? '✓' : index + 1}
                      </div>
                      <div className="flex-1">
                        <p className={`text-base leading-relaxed transition-colors ${
                          isSelected
                            ? 'text-green-200'
                            : 'text-white group-hover:text-purple-200'
                        }`}>
                          {suggestion}
                        </p>
                        {isSelected && (
                          <p className="text-xs text-green-400 mt-1">✓ Agregado</p>
                        )}
                      </div>
                      <div className={`flex-shrink-0 transition-opacity ${
                        isSelected
                          ? 'text-green-400 opacity-100'
                          : 'text-purple-400 opacity-0 group-hover:opacity-100'
                      }`}>
                        {isSelected ? <Check className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Contador y botón para cerrar */}
            <div className="flex flex-col items-center gap-4">
              {selectedSuggestions.length > 0 && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg px-4 py-2">
                  <p className="text-green-300 text-sm font-medium">
                    ✓ {selectedSuggestions.length} objetivo{selectedSuggestions.length > 1 ? 's' : ''} agregado{selectedSuggestions.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
              <button
                onClick={handleCloseQuantumModal}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-lg"
              >
                Listo, continuar
              </button>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-gray-400 text-sm text-center">
                ✨ Estas sugerencias están diseñadas con la <strong className="text-purple-300">Fórmula de Poder</strong>: Acción + Resultado Medible<br/>
                <span className="text-xs text-gray-500">Las fechas y frecuencias se definirán en los siguientes pasos</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SUGERENCIAS QUANTUM PARA ACCIONES (PASO 3) */}
      {showActionSuggestionsModal.show && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border-2 border-purple-500/50 rounded-2xl max-w-3xl w-full p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Atom className="w-10 h-10 text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
                  <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">QUANTUM Estratega</h3>
                  <p className="text-purple-300 text-sm">Acciones SMART para tu objetivo</p>
                </div>
              </div>
              <button
                onClick={handleCloseActionSuggestionsModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <span className="text-2xl">✕</span>
              </button>
            </div>

            {/* Objetivo actual */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
              <p className="text-blue-300 text-xs font-bold mb-2">🎯 TU OBJETIVO:</p>
              <p className="text-white text-sm leading-relaxed">{showActionSuggestionsModal.objetivo}</p>
              <p className="text-blue-200 text-xs mt-3">
                💡 <strong>Selecciona una o varias acciones</strong> que te llevarán a cumplir este objetivo.
              </p>
            </div>

            {/* Lista de Sugerencias de Acciones */}
            <div className="space-y-3 mb-6">
              {showActionSuggestionsModal.suggestions.map((suggestion, index) => {
                const isSelected = selectedActionSuggestions.includes(suggestion);
                return (
                  <button
                    key={index}
                    onClick={() => handleSelectActionSuggestion(suggestion, showActionSuggestionsModal.objetoId)}
                    disabled={isSelected}
                    className={`group w-full text-left transition-all duration-300 rounded-xl p-4 border-2 ${
                      isSelected
                        ? 'bg-gradient-to-r from-green-600/30 to-green-600/20 border-green-500/50 cursor-not-allowed'
                        : 'bg-gradient-to-r from-gray-800 to-gray-800/50 hover:from-purple-600/20 hover:to-blue-600/20 border-gray-700 hover:border-purple-500/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm transition-transform ${
                        isSelected
                          ? 'bg-green-500'
                          : 'bg-gradient-to-br from-purple-500 to-blue-500 group-hover:scale-110'
                      }`}>
                        {isSelected ? '✓' : index + 1}
                      </div>
                      <div className="flex-1">
                        <p className={`text-base leading-relaxed transition-colors ${
                          isSelected
                            ? 'text-green-200'
                            : 'text-white group-hover:text-purple-200'
                        }`}>
                          {suggestion}
                        </p>
                        {isSelected && (
                          <p className="text-xs text-green-400 mt-1">✓ Acción agregada</p>
                        )}
                      </div>
                      <div className={`flex-shrink-0 transition-opacity ${
                        isSelected
                          ? 'text-green-400 opacity-100'
                          : 'text-purple-400 opacity-0 group-hover:opacity-100'
                      }`}>
                        {isSelected ? <Check className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Contador y botón para cerrar */}
            <div className="flex flex-col items-center gap-4">
              {selectedActionSuggestions.length > 0 && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg px-4 py-2">
                  <p className="text-green-300 text-sm font-medium">
                    ✓ {selectedActionSuggestions.length} acción{selectedActionSuggestions.length > 1 ? 'es' : ''} agregada{selectedActionSuggestions.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
              <button
                onClick={handleCloseActionSuggestionsModal}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-lg"
              >
                Listo, continuar
              </button>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-gray-400 text-sm text-center">
                ✨ Estas acciones están diseñadas con <strong className="text-purple-300">criterios SMART</strong><br/>
                <span className="text-xs text-gray-500">Específicas, Medibles, Alcanzables, Relevantes</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
