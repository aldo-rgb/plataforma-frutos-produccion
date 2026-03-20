'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, Sparkles, AlertCircle, Loader2, CheckCircle2, Brain, Atom, Settings, Send } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import QuantumIdentityModal from '@/components/quantum/QuantumIdentityModal';
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
  { id: 4, title: 'Acciones', subtitle: 'Frecuencia', emoji: '🔥' },
  { id: 5, title: 'Avatar', subtitle: 'Tu Identidad', emoji: '⚡' }
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
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [hasAvatar, setHasAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [errorModal, setErrorModal] = useState<{ show: boolean; title: string; message: string }>({ 
    show: false, 
    title: '', 
    message: '' 
  });
  
  // NUEVO: Modal de confirmación para usuarios FREE graduados sin mentor
  const [showNoMentorConfirmModal, setShowNoMentorConfirmModal] = useState(false);
  
  // NUEVO: Estado para saber si el usuario pertenece a un grupo/visión
  const [perteneceAGrupo, setPerteneceAGrupo] = useState(false);
  const [areasActivas, setAreasActivas] = useState<typeof AREAS>([]);
  const [showAreaConfig, setShowAreaConfig] = useState(false);
  const [objetivoInvitados, setObjetivoInvitados] = useState<number | null>(null);
  const [visionEndDate, setVisionEndDate] = useState<string | null>(null);
  
  // NUEVO: Nivel del usuario (BASIC, ADVANCED, PL) - para controlar si puede enviar carta
  const [userLevel, setUserLevel] = useState<string | null>(null);
  
  // NUEVO: Tier del usuario (FREE, STANDARD, PREMIUM) - para controlar acceso a áreas
  const [userTier, setUserTier] = useState<string>('FREE');
  
  // NUEVO: Color corporativo de la organización
  const [brandColor, setBrandColor] = useState<string>('#6366F1');
  
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
  
  // NUEVO: Modal de selección Quantum (Voz vs Texto)
  const [showQuantumSelectionModal, setShowQuantumSelectionModal] = useState(false);
  
  // PASO 4: Iterador de configuración
  const [currentMetaIndex, setCurrentMetaIndex] = useState(0);
  const [metasConfiguradas, setMetasConfiguradas] = useState<MetaConfig[]>([]);
  const [accionesRevisadas, setAccionesRevisadas] = useState<Set<string>>(new Set()); // Track de acciones que el usuario ya revisó
  
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

  const loadQuantumDraft = (email: string, areasActivas: typeof AREAS = []) => {
    try {
      console.log(`🔍 Intentando cargar draft de Quantum para: ${email}`);
      
      // Intentar buscar primero con la key nueva (con email)
      const quantumDraftKey = `quantum_draft_data_${email}`;
      let quantumDraftStr = localStorage.getItem(quantumDraftKey);
      
      console.log(`🔑 Buscando en localStorage con key: ${quantumDraftKey}`);
      console.log(`📦 Resultado: ${quantumDraftStr ? 'ENCONTRADO' : 'NULL/UNDEFINED'}`);
      
      // Si no existe, buscar la key antigua para retrocompatibilidad
      if (!quantumDraftStr) {
        console.log('🔄 No encontrado con key nueva, intentando key antigua: quantum-carta-draft');
        quantumDraftStr = localStorage.getItem('quantum-carta-draft');
        console.log(`📦 Resultado key antigua: ${quantumDraftStr ? 'ENCONTRADO' : 'NULL/UNDEFINED'}`);
      }
      
      if (!quantumDraftStr) {
        console.log('⚠️ No se encontró ningún draft de Quantum en localStorage');
        return;
      }

      const quantumDraft = JSON.parse(quantumDraftStr);
      console.log('🤖 Cargando datos desde Quantum IA:', quantumDraft);

      // Determinar si viene del nuevo formato (array metas[]) o formato antiguo
      const cartaData = quantumDraft.cartaData || quantumDraft;
      const metasArray = cartaData.metas || [];
      
      // Crear set de áreas activas para filtrado rápido
      const areasActivasKeys = new Set(areasActivas.map(a => a.key));
      console.log('📦 Estructura de datos detectada:', { 
        tieneCartaData: !!quantumDraft.cartaData,
        source: quantumDraft.source,
        metasCount: metasArray.length,
        areasActivas: Array.from(areasActivasKeys)
      });

      // Prellenar declaraciones del ser
      const declaraciones: Record<string, string> = {};
      const identidades: Record<string, Meta[]> = {};
      const metas: Record<string, Meta[]> = {};
      const configs: MetaConfig[] = [];

      // Mapear las áreas de Quantum al formato del wizard
      const areaMapping: Record<string, string> = {
        'FINANZAS': 'finanzas',
        'RELACIONES': 'relaciones',
        'TALENTOS': 'talentos',
        'SALUD': 'salud',
        'PAZ MENTAL': 'pazMental',
        'OCIO': 'ocio',
        'SERVICIO TRANSFORMACIONAL': 'servicioTrans',
        'COMUNIDAD': 'servicioComun'
      };

      // Contador de objetivos por área para generar IDs únicos
      const objetivosPorArea: Record<string, number> = {};

      metasArray.forEach((meta: any, metaIndex: number) => {
        const quantumArea = meta.area; // "SALUD", "RELACIONES", etc.
        const areaKey = areaMapping[quantumArea];
        
        console.log(`🔍 Procesando meta ${metaIndex + 1}:`, { 
          quantumArea, 
          areaKey, 
          meta_principal: meta.meta_principal 
        });
        
        if (!areaKey) {
          console.log(`⚠️ Área ${quantumArea} no mapeada`);
          return;
        }

        // FILTRO: Solo procesar si el área está activa para esta Vision
        if (areasActivas.length > 0 && !areasActivasKeys.has(areaKey)) {
          console.log(`⛔ Área ${areaKey} NO está habilitada para esta Vision - OMITIENDO`);
          return;
        }

        console.log(`✅ Área ${areaKey} está habilitada - procesando...`);

        // Declaración del ser (Paso 1) - Solo guardar UNA VEZ por área
        if (meta.declaracion_poder && !declaraciones[areaKey]) {
          declaraciones[areaKey] = meta.declaracion_poder;
          console.log(`✅ Declaración guardada para ${areaKey}:`, meta.declaracion_poder);
        }

        // Incrementar contador de objetivos para esta área
        if (!objetivosPorArea[areaKey]) {
          objetivosPorArea[areaKey] = 0;
          identidades[areaKey] = []; // Inicializar array de objetivos
        }
        objetivosPorArea[areaKey]++;
        const objNum = objetivosPorArea[areaKey];
        const objetivoId = `${areaKey}-obj-${objNum}`;

        // Objetivo (Paso 2) - AGREGAR al array, no reemplazar
        if (meta.meta_principal) {
          identidades[areaKey].push({
            id: objetivoId,
            description: meta.meta_principal,
            isValid: true
          });
          console.log(`✅ Objetivo ${objNum} guardado para ${areaKey}:`, meta.meta_principal);

          // Acciones (Paso 3) - Parsear desde "Acción (Frecuencia)"
          if (meta.tareas_acciones && Array.isArray(meta.tareas_acciones) && meta.tareas_acciones.length > 0) {
            metas[objetivoId] = meta.tareas_acciones.map((accionStr: string, idx: number) => ({
              id: `${objetivoId}-meta-${idx + 1}`,
              description: accionStr.split('(')[0].trim(), // Extraer nombre de acción
              isValid: true
            }));
            console.log(`✅ ${meta.tareas_acciones.length} acciones guardadas para objetivo ${objetivoId}:`, 
              meta.tareas_acciones);

            // Configuración de frecuencia (Paso 4)
            meta.tareas_acciones.forEach((accionStr: string, idx: number) => {
              const metaId = `${objetivoId}-meta-${idx + 1}`;
              
              // Extraer frecuencia del formato "Acción (Frecuencia)"
              const match = accionStr.match(/\(([^)]+)\)/);
              const frecuenciaStr = match ? match[1].trim() : 'Diaria';
              
              // Convertir frecuencia de Quantum al formato del ConfiguradorAccionIterativo
              let type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME' = 'DAILY';
              let selectedDays: number[] = [];

              if (frecuenciaStr === 'Diaria') {
                type = 'DAILY';
              } else if (frecuenciaStr === 'Semanal') {
                type = 'WEEKLY';
                selectedDays = [1]; // Lunes por defecto
              } else if (frecuenciaStr === 'Quincenal') {
                type = 'WEEKLY';
                selectedDays = [1]; // Lunes por defecto (cada 2 semanas)
              } else if (frecuenciaStr === 'Mensual') {
                type = 'MONTHLY';
                selectedDays = [1]; // Día 1 por defecto
              } else if (frecuenciaStr.includes('Lun-Vie')) {
                type = 'WEEKLY';
                selectedDays = [1, 2, 3, 4, 5]; // Lunes a Viernes
              } else {
                // Por defecto: Diaria
                type = 'DAILY';
              }

              configs.push({
                metaId,
                areaKey,
                description: accionStr.split('(')[0].trim(),
                config: {
                  type,
                  selectedDays: type === 'WEEKLY' ? selectedDays : undefined,
                  monthDays: type === 'MONTHLY' ? selectedDays : undefined
                }
              });
            });
          }
        }
      });

      // Aplicar los datos extraídos
      console.log('📦 Datos extraídos de Quantum:', {
        identidadesPorArea: identidades,
        metasPorArea: metas,
        metasConfiguradas: configs
      });
      console.log(`📋 Procesando ${configs.length} acciones totales`);
      console.log(`✅ Áreas procesadas: ${Object.keys(declaraciones).length} declaraciones, ${Object.keys(identidades).length} áreas con objetivos, ${Object.keys(metas).length} objetivos con acciones`);
      console.log(`📊 Resumen por área:`, {
        declaraciones: Object.keys(declaraciones),
        objetivosPorArea,
        acciones: Object.keys(metas)
      });
      
      if (Object.keys(declaraciones).length > 0) {
        setDeclaracionesSer(declaraciones);
        console.log('✅ Declaraciones del ser prellenadas desde Quantum');
      }
      if (Object.keys(identidades).length > 0) {
        setIdentidadesPorArea(identidades);
        console.log('✅ Objetivos prellenados desde Quantum');
      }
      if (Object.keys(metas).length > 0) {
        setMetasPorArea(metas);
        console.log('✅ Acciones prellenadas desde Quantum');
        
        // NUEVO: Analizar cada acción precargada para extraer información SMART
        const extractedInfo: Record<string, ExtractedInfo> = {};
        Object.entries(metas).forEach(([objetivoId, acciones]) => {
          acciones.forEach((accion) => {
            const extracted = extractSmartInfo(accion.description);
            extractedInfo[accion.id] = extracted;
            console.log(`🔍 Acción de Quantum analizada [${accion.id}]:`, {
              descripcion: accion.description,
              frecuenciaDetectada: extracted.frequency,
              confidence: extracted.confidence
            });
          });
        });
        
        setExtractedInfoByMeta(extractedInfo);
        console.log(`✅ ${Object.keys(extractedInfo).length} acciones analizadas para sugerencias de frecuencia`);
      }
      if (configs.length > 0) {
        setMetasConfiguradas(configs);
        console.log('✅ Configuración de frecuencias prellenada desde Quantum');
      }

      // Mostrar notificación de éxito
      showToast('✨ Información de Quantum cargada exitosamente');
      
      // IMPORTANTE: Guardar inmediatamente en localStorage para que persista
      const localStorageKey = `carta-wizard-draft-${email}`;
      const draftToSave = {
        declaracionesSer: declaraciones,
        identidadesPorArea: identidades,
        metasPorArea: metas,
        metasConfiguradas: configs,
        currentStep: 4, // Ir directo al Paso 4
        currentMetaIndex: 0,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(localStorageKey, JSON.stringify(draftToSave));
      console.log('💾 Draft de Quantum guardado en localStorage con configs:', configs.length);

      // Limpiar ambos formatos de draft de Quantum para evitar cargas duplicadas
      localStorage.removeItem('quantum-carta-draft');
      localStorage.removeItem(`quantum_draft_data_${email}`);

    } catch (error) {
      console.error('Error cargando draft de Quantum:', error);
    }
  };

  const loadCarta = async () => {
    let userEmailForDraft = 'guest';
    let areasActivasParaDraft: typeof AREAS = [];
    let transformationTargetValue: number | null = null;
    
    try {
      // PRIMERO: Obtener datos del usuario actual (con cache-buster para datos frescos)
      const res = await fetch(`/api/carta/my-carta?t=${Date.now()}`, {
        cache: 'no-store'
      });
      const data = await res.json();
      
      console.log('📥 Data from API:', data);
      console.log('🖼️ ProfileImage from API:', data.carta?.Usuario?.profileImage);
      
      // Verificar si el usuario tiene avatar cuántico
      if (data.carta?.Usuario?.profileImage) {
        setHasAvatar(true);
        setAvatarUrl(data.carta.Usuario.profileImage);
        console.log('✅ Usuario tiene avatar cuántico:', data.carta.Usuario.profileImage);
      } else {
        setHasAvatar(false);
        setAvatarUrl('');
        console.log('⚠️ Usuario no tiene avatar cuántico');
      }
      
      // NUEVO: Obtener configuración personalizada de áreas
      const areasConfigRes = await fetch('/api/areas-config');
      const areasConfigData = await areasConfigRes.json();
      
      console.log('⚙️ Areas config:', areasConfigData);
      
      const perteneceGrupo = areasConfigData.perteneceAGrupo || false;
      transformationTargetValue = areasConfigData.transformationGuestsTarget || null;
      const visionEndDateValue = areasConfigData.visionEndDate || null;
      const userLevelValue = areasConfigData.userLevel || null;
      const userTierValue = areasConfigData.userTier || 'FREE';
      const brandColorValue = areasConfigData.brandColor || '#6366F1';
      
      // Guardar color corporativo
      setBrandColor(brandColorValue);
      console.log(`🎨 Color corporativo: ${brandColorValue}`);
      
      // Guardar nivel del usuario
      if (userLevelValue) {
        setUserLevel(userLevelValue);
        console.log(`📊 Nivel del usuario: ${userLevelValue}`);
      }
      
      // Guardar tier del usuario
      setUserTier(userTierValue);
      console.log(`💎 Tier del usuario: ${userTierValue}`);
      
      // Guardar objetivo de invitados si existe
      if (transformationTargetValue) {
        setObjetivoInvitados(transformationTargetValue);
        console.log(`🎯 Objetivo de invitados: ${transformationTargetValue} personas`);
      }
      
      // Guardar fecha de fin de Vision si existe
      if (visionEndDateValue) {
        setVisionEndDate(visionEndDateValue);
        console.log(`📅 Fecha fin de Vision: ${visionEndDateValue}`);
      }
      
      // Filtrar áreas según configuración personalizada
      const areasHabilitadas = areasConfigData.areas || [];
      
      console.log('🔍 Respuesta de /api/areas-config:', {
        perteneceAGrupo: perteneceGrupo,
        userLevel: userLevelValue,
        totalAreasDevueltas: areasHabilitadas.length,
        areas: areasHabilitadas.map((a: any) => ({ key: a.areaKey, enabled: a.enabled }))
      });
      
      const areasFiltradas = AREAS.filter(area => {
        const config = areasHabilitadas.find((c: any) => c.areaKey === area.key);
        
        // Si hay configuración explícita para esta área, usarla (aplica para Vision y Lobo Solitario)
        if (config !== undefined) {
          const isEnabled = config.enabled === true;
          const tipo = perteneceGrupo ? 'Vision' : 'Lobo Solitario';
          console.log(`${isEnabled ? '✅' : '⛔'} Área ${area.name} (${area.key}): ${config.enabled ? 'HABILITADA' : 'DESHABILITADA'} (${tipo} config)`);
          return isEnabled;
        }
        
        // Si NO hay configuración explícita:
        
        // Usuario Vision sin configuración de esta área: deshabilitarla
        if (perteneceGrupo) {
          console.log(`⛔ Área ${area.name} (${area.key}): DESHABILITADA (Vision no la configuró)`);
          return false;
        }
        
        // Lobo Solitario sin configuración: excluir servicios, habilitar áreas básicas
        if (area.key === 'servicioTrans' || area.key === 'servicioComun') {
          console.log(`⛔ Área ${area.name} (${area.key}): DESHABILITADA (Lobo Solitario sin config, área de servicio)`);
          return false;
        }
        
        // Lobo Solitario sin configuración: habilitar áreas básicas por defecto
        console.log(`✅ Área ${area.name} (${area.key}): HABILITADA (Lobo Solitario sin config, área básica default)`);
        return true;
      });
      
      setAreasActivas(areasFiltradas);
      areasActivasParaDraft = areasFiltradas;
      setPerteneceAGrupo(perteneceGrupo);
      console.log(`📋 Áreas activas configuradas:`, areasFiltradas.map(a => a.name));
      
      // Obtener ID del usuario para el localStorage key específico
      const email = data.carta?.Usuario?.email || 'guest';
      userEmailForDraft = email;
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
      
      // IMPORTANTE: Cargar datos de Quantum DESPUÉS de tener el email
      // Usar setTimeout para asegurar que el estado se haya actualizado
      setTimeout(() => {
        loadQuantumDraft(userEmailForDraft, areasActivasParaDraft);
        
        // DESPUÉS de cargar Quantum, asegurar que el objetivo de SERVICIO TRANSFORMACIONAL
        // esté configurado si la Vision lo requiere
        if (transformationTargetValue && areasActivasParaDraft.some(a => a.key === 'servicioTrans')) {
          setTimeout(() => {
            setIdentidadesPorArea(prev => {
              // Si ya existe un objetivo de Quantum, no sobrescribir
              if (prev.servicioTrans && prev.servicioTrans.length > 0) {
                console.log('✅ SERVICIO TRANSFORMACIONAL ya tiene objetivos de Quantum');
                return prev;
              }
              
              // Si no hay objetivos, establecer el objetivo predefinido
              console.log(`✅ Estableciendo objetivo predefinido para SERVICIO TRANSFORMACIONAL: Enrolar a ${transformationTargetValue} personas`);
              return {
                ...prev,
                servicioTrans: [{
                  id: 'servicioTrans-obj-predefinido',
                  description: `Enrolar a ${transformationTargetValue} personas`,
                  isValid: true
                }]
              };
            });
          }, 200);
        }
      }, 100);
    }
  };

  // Prellenar objetivo de SERVICIO TRANSFORMACIONAL cuando esté disponible
  useEffect(() => {
    if (objetivoInvitados && areasActivas.some(a => a.key === 'servicioTrans')) {
      setIdentidadesPorArea(prev => {
        // Solo prellenar si no existe ya o está vacío
        if (!prev.servicioTrans || prev.servicioTrans.length === 0) {
          console.log(`✅ Prellenando objetivo de Servicio Transformacional: Enrolar a ${objetivoInvitados} personas`);
          return {
            ...prev,
            servicioTrans: [{
              id: 'servicioTrans-obj-predefinido',
              description: `Enrolar a ${objetivoInvitados} personas`,
              isValid: true
            }]
          };
        }
        return prev;
      });
    }
  }, [objetivoInvitados, areasActivas]);

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
  const canAdvanceToStep5 = () => validateStep1() && validateStep2() && validateStep3() && validateStep4();
  const canSubmit = () => validateStep1() && validateStep2() && validateStep3() && validateStep4() && hasAvatar;

  // ========== NAVEGACIÓN PASO 3 (ITERATIVA) - OBJETIVOS ==========
  
  // Obtener lista plana de objetivos del Paso 2 para iterar en Paso 3
  const getObjetivosFlattened = (): { areaKey: string; areaName: string; areaEmoji: string; objetivo: Meta; index: number; total: number }[] => {
    const flattened: any[] = [];
    // Filtrar áreas de servicio si el usuario no es PL
    const areasParaObjetivos = userLevel === 'PL' 
      ? areasActivas 
      : areasActivas.filter(a => a.key !== 'servicioTrans' && a.key !== 'servicioComun');
    
    areasParaObjetivos.forEach(area => {
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
      
      // Si es Servicio Transformacional, generar tareas automáticamente
      if (currentObjetivoData.areaKey === 'servicioTrans') {
        // Solo generar si no hay tareas ya creadas para este objetivo
        if (!metasPorArea[objetoId] || metasPorArea[objetoId].length === 0) {
          console.log('🎯 Generando tareas automáticas de enrolamiento para:', objetivoInvitados, 'personas');
          const tareasEnrolamiento: Meta[] = [];
          const configsEnrolamiento: MetaConfig[] = [];
          
          // Función para obtener el ordinal correcto
          const getOrdinal = (num: number): string => {
            if (num === 1) return '1er';
            if (num === 2) return '2ndo';
            if (num === 3) return '3er';
            if (num === 4) return '4to';
            return `${num}to`; // Para casos mayores a 4
          };
          
          for (let i = 1; i <= (objetivoInvitados || 0); i++) {
            const tareaId = `${objetoId}-enrolamiento-${i}-${Date.now()}-${Math.random()}`;
            const descripcionTarea = `Enrolar al ${getOrdinal(i)} Participante`;
            
            tareasEnrolamiento.push({
              id: tareaId,
              description: descripcionTarea,
              isValid: true
            });
            
            // Pre-configurar con ONE_TIME y fecha de fin de Vision
            configsEnrolamiento.push({
              metaId: tareaId,
              areaKey: 'servicioTrans',
              description: descripcionTarea,
              config: {
                type: 'ONE_TIME',
                deadline: visionEndDate,
                specificDate: visionEndDate
              }
            });
          }
          
          setMetasPorArea(prev => ({
            ...prev,
            [objetoId]: tareasEnrolamiento
          }));
          
          // Pre-configurar todas las tareas de enrolamiento
          setMetasConfiguradas(prev => {
            // Filtrar cualquier configuración previa de estas tareas
            const sinEnrolamiento = prev.filter(mc => !mc.metaId.includes('-enrolamiento-'));
            return [...sinEnrolamiento, ...configsEnrolamiento];
          });
          
          // Marcar todas las tareas de enrolamiento como revisadas automáticamente
          setAccionesRevisadas(prev => {
            const nuevasRevisadas = new Set(prev);
            configsEnrolamiento.forEach(config => nuevasRevisadas.add(config.metaId));
            return nuevasRevisadas;
          });
          
          setHasChanges(true);
          console.log(`✅ ${objetivoInvitados} tareas de enrolamiento creadas y pre-configuradas automáticamente`);
          console.log(`📅 Fecha límite configurada: ${visionEndDate}`);
          console.log(`✅ Tareas marcadas como revisadas automáticamente`);
        }
      } else {
        // Para otras áreas, cargar sugerencias QUANTUM
        if (!actionSuggestionsByObjetivo[objetoId] || actionSuggestionsByObjetivo[objetoId].length === 0) {
          console.log('🔄 Cargando sugerencias QUANTUM para objetivo:', currentObjetivoData.objetivo.description);
          handleGetActionSuggestions(
            currentObjetivoData.objetivo.description,
            currentObjetivoData.objetivo.id,
            currentObjetivoData.areaKey
          );
        } else {
          console.log('✅ Sugerencias ya cargadas para este objetivo');
        }
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
    console.log('🔄 Solicitando sugerencias para:', { objetivo, areaKey });
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

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('❌ Error response:', errorData);
        console.error('❌ Status:', response.status, response.statusText);
        throw new Error(errorData.error || 'Error obteniendo sugerencias de acciones');
      }

      const data = await response.json();
      console.log('✅ Sugerencias recibidas:', data);
      
      // Guardar sugerencias inline en lugar de modal
      setActionSuggestionsByObjetivo(prev => ({
        ...prev,
        [objetoId]: data.acciones || []
      }));
    } catch (error) {
      console.error('❌ Error obteniendo sugerencias de acciones:', error);
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
    const updatedMetas = [...currentMetas, newMeta];
    setMetasPorArea({
      ...metasPorArea,
      [objetoId]: updatedMetas
    });
    setHasChanges(true);
    
    // Remover la sugerencia seleccionada de la lista actual
    const currentSuggestions = actionSuggestionsByObjetivo[objetoId] || [];
    const remainingSuggestions = currentSuggestions.filter(s => s !== suggestion);
    
    // Actualizar inmediatamente con las sugerencias restantes
    setActionSuggestionsByObjetivo(prev => ({
      ...prev,
      [objetoId]: remainingSuggestions
    }));
    
    // Mostrar notificación
    showToast('Acción agregada exitosamente');
    
    // Generar UNA nueva sugerencia para mantener siempre 3
    try {
      const objetivo = getObjetivosFlattened().find(obj => obj.objetivo.id === objetoId);
      if (objetivo) {
        const accionesExistentes = updatedMetas.map(a => a.description);
        const todasLasAccionesAEvitar = [...remainingSuggestions, ...accionesExistentes];
        
        const response = await fetch('/api/quantum/sugerir-acciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objetivo: objetivo.objetivo.description,
            areaName: objetivo.areaName,
            accionesExistentes: todasLasAccionesAEvitar,
            cantidad: 1
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('📦 Respuesta del servidor:', data);
          
          // El endpoint devuelve { acciones: [...] }
          if (data.acciones && Array.isArray(data.acciones) && data.acciones.length > 0) {
            let nuevaAccion = data.acciones[0].trim();
            
            // Limpiar cualquier formato (numeración, viñetas, etc.)
            nuevaAccion = nuevaAccion
              .replace(/^[\d\.\-\*\+]+\s*/, '') // Remover numeración al inicio
              .replace(/^["'\`]+|["'\`]+$/g, '') // Remover comillas
              .trim();
            
            console.log('🔍 Nueva acción generada:', nuevaAccion);
            console.log('📏 Longitud:', nuevaAccion.length);
            
            if (nuevaAccion.length > 15) {
              setActionSuggestionsByObjetivo(prev => {
                const currentSuggestions = prev[objetoId] || [];
                const updatedSuggestions = [...currentSuggestions, nuevaAccion].slice(-3);
                console.log(`✅ Actualizando sugerencias. Total: ${updatedSuggestions.length}`);
                return {
                  ...prev,
                  [objetoId]: updatedSuggestions
                };
              });
            } else {
              console.warn('⚠️ Acción generada muy corta, no se agregará');
            }
          } else {
            console.warn('⚠️ No se recibieron acciones en la respuesta');
          }
        } else {
          console.error('❌ Error en respuesta de API, status:', response.status);
        }
      }
    } catch (error) {
      console.error('❌ Error generando nueva sugerencia:', error);
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
    showToast('Acción agregada exitosamente');
  };

  const handleCloseActionSuggestionsModal = () => {
    setShowActionSuggestionsModal({ show: false, objetivo: '', objetoId: '', suggestions: [] });
    setSelectedActionSuggestions([]);
  };

  const handleNextObjetivo = () => {
    // Validar que el objetivo actual tenga al menos una acción
    const currentObjetivoId = objetivosFlattened[currentObjetivoIndexStep3]?.objetivo.id;
    const accionesActuales = metasPorArea[currentObjetivoId] || [];
    
    // Permitir avanzar solo si hay al menos una acción válida
    // EXCEPCIÓN: Área de Servicio Transformacional genera acciones automáticamente
    const currentAreaKey = objetivosFlattened[currentObjetivoIndexStep3]?.areaKey;
    const esServicioTransformacional = currentAreaKey === 'servicioTrans';
    
    if (!esServicioTransformacional && accionesActuales.length === 0) {
      setErrorModal({
        show: true,
        title: '⚠️ Acción requerida',
        message: 'Debes agregar al menos una acción SMART para este objetivo antes de continuar.'
      });
      return;
    }
    
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
  const metasFlattened = useMemo(() => {
    const flattened: any[] = [];
    const seenIds = new Set<string>();
    
    // Filtrar áreas de servicio si el usuario no es PL
    const areasParaMetas = userLevel === 'PL' 
      ? areasActivas 
      : areasActivas.filter(a => a.key !== 'servicioTrans' && a.key !== 'servicioComun');
    
    // Iterar sobre cada objetivo del Paso 2
    areasParaMetas.forEach(area => {
      const objetivos = identidadesPorArea[area.key] || [];
      
      objetivos.forEach((objetivo) => {
        // Para cada objetivo, obtener sus acciones del Paso 3
        const accionesPorObjetivo = metasPorArea[objetivo.id] || [];
        
        accionesPorObjetivo.forEach((accion) => {
          // Detectar duplicados por ID
          if (seenIds.has(accion.id)) {
            console.warn('⚠️ DUPLICADO DETECTADO:', {
              id: accion.id,
              description: accion.description,
              areaKey: area.key,
              objetivoId: objetivo.id
            });
            return; // Skip este duplicado
          }
          
          seenIds.add(accion.id);
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
    
    console.log('📊 metasFlattened calculado:', {
      total: flattened.length,
      uniqueIds: seenIds.size,
      actions: flattened.map(f => ({ id: f.meta.id, desc: f.meta.description.substring(0, 30) }))
    });
    
    return flattened;
  }, [areasActivas, identidadesPorArea, metasPorArea, userLevel]);

  const currentMetaData = metasFlattened[currentMetaIndex];

  const handleSaveMetaConfig = (config: any) => {
    const newConfig: MetaConfig = {
      metaId: currentMetaData.meta.id,
      areaKey: currentMetaData.areaKey,
      description: currentMetaData.meta.description,
      config
    };

    setMetasConfiguradas([...metasConfiguradas.filter(mc => mc.metaId !== newConfig.metaId), newConfig]);
    
    // Marcar esta acción como revisada por el usuario
    setAccionesRevisadas(prev => new Set([...prev, currentMetaData.meta.id]));
    
    setHasChanges(true);
    console.log('🔄 Cambio detectado en configuración de meta');
    console.log('✅ Acción marcada como revisada:', currentMetaData.meta.id);
  };

  const handleNextMeta = () => {
    // Marcar la acción actual como revisada antes de avanzar
    if (currentMetaData) {
      setAccionesRevisadas(prev => new Set([...prev, currentMetaData.meta.id]));
    }
    
    if (currentMetaIndex < metasFlattened.length - 1) {
      setCurrentMetaIndex(currentMetaIndex + 1);
    } else {
      // Si ya configuramos todas las metas, mostrar mensaje de éxito
      console.log('✅ Todas las metas configuradas y revisadas');
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
      console.log('📊 DEBUG Resumen - metasFlattened:', metasFlattened.length);
      console.log('📊 DEBUG Resumen - metasConfiguradas:', metasConfiguradas.length);
      
      // DEDUPLICAR metasConfiguradas por metaId antes de guardar
      const uniqueMetasConfiguradas = Array.from(
        new Map(metasConfiguradas.map(m => [m.metaId, m])).values()
      );
      
      if (uniqueMetasConfiguradas.length < metasConfiguradas.length) {
        console.warn(`⚠️ Se detectaron ${metasConfiguradas.length - uniqueMetasConfiguradas.length} metas duplicadas. Eliminando...`);
      }
      
      console.log('💾 Guardando', uniqueMetasConfiguradas.length, 'metas únicas...');
      
      for (let i = 0; i < uniqueMetasConfiguradas.length; i++) {
        const metaConfig = uniqueMetasConfiguradas[i];
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
            // Usar la descripción del objetivo específico, no la primera del área
            declaracionPoder: metaData.objetivoDescription || ''
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
      
      // ⚠️ Verificar si requiere pago (402 Payment Required)
      if (submitRes.status === 402 && submitData.requiresPayment) {
        console.log('💳 Requiere pago - Redirigiendo a suscripción');
        setSubmitting(false);
        // Redirigir a la página de suscripción
        window.location.href = submitData.redirectTo || '/dashboard/suscripcion';
        return;
      }
      
      // PRIMERO: Verificar si requiere confirmación (usuario FREE graduado sin mentor)
      if (submitRes.status === 200 && submitData.requiresConfirmation && submitData.canContinueWithoutMentor) {
        console.log('🔄 Usuario FREE graduado sin mentor - requiere confirmación');
        setShowNoMentorConfirmModal(true);
        return; // No continuar con el flujo normal
      }
      
      if (submitRes.ok && submitData.success) {
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
          title: '✅ ¡Carta Guardada!',
          message: submitData.message || 'Tu carta ha sido guardada exitosamente.'
        });
        
        setTimeout(() => {
          window.location.href = '/dashboard/carta/resumen';
        }, 2000);
      } else if (submitRes.status === 403 && submitData.requiresMentor) {
        // Usuario de Vision sin mentor asignado
        console.log('❌ Requiere mentor - Usuario de Vision:', submitData.visionName);
        setErrorModal({
          show: true,
          title: '👥 Mentor Requerido',
          message: submitData.message || 'Debes tener un mentor asignado para enviar tu carta a revisión. Contacta a tu coordinador.'
        });
        // No redirigir, solo mostrar mensaje
      } else if (submitRes.status === 403 && submitData.requiresSubscription) {
        // Redirección a suscripción si es necesario
        setErrorModal({
          show: true,
          title: '🔒 Suscripción Requerida',
          message: submitData.message || 'Necesitas una suscripción activa para enviar tu carta a revisión.'
        });
        
        setTimeout(() => {
          window.location.href = '/dashboard/suscripcion';
        }, 2500);
      } else {
        // Error del servidor - mostrar detalles para debugging
        console.error('❌ Error del servidor:', {
          status: submitRes.status,
          statusText: submitRes.statusText,
          data: submitData
        });
        
        // Construir mensaje de error más específico
        let errorMessage = submitData.message || submitData.error || 'Hubo un problema al enviar tu carta.';
        
        // Si hay detalles adicionales, agregarlos
        if (submitData.details) {
          errorMessage += `\n\nDetalles: ${submitData.details}`;
        }
        
        setErrorModal({
          show: true,
          title: '❌ Error al enviar',
          message: errorMessage
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

  // NUEVO: Función para confirmar envío sin mentor (usuarios FREE graduados)
  const handleConfirmWithoutMentor = async () => {
    setShowNoMentorConfirmModal(false);
    setSubmitting(true);
    
    try {
      console.log('📤 Enviando carta SIN mentor (usuario FREE graduado)...');
      
      // Obtener cartaId primero
      const getRes = await fetch('/api/carta/my-carta');
      const getData = await getRes.json();
      
      if (!getData.carta?.id) {
        throw new Error('No se pudo obtener el ID de la carta');
      }
      
      const cartaId = getData.carta.id;
      
      const submitRes = await fetch('/api/carta/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cartaId, 
          continueWithoutMentor: true 
        })
      });
      
      const submitData = await submitRes.json();
      
      if (submitData.success) {
        setEstado('APROBADA');
        setHasChanges(false);
        
        console.log('✅ Carta auto-aprobada exitosamente (sin mentor)');
        
        setErrorModal({
          show: true,
          title: '✅ ¡Carta Aprobada!',
          message: submitData.message || 'Tu carta ha sido aprobada automáticamente y tus tareas han sido generadas.'
        });
        
        setTimeout(() => {
          window.location.href = '/dashboard/carta/resumen';
        }, 2000);
      } else {
        console.error('❌ Error al aprobar carta sin mentor:', submitData);
        setErrorModal({
          show: true,
          title: '❌ Error',
          message: submitData.message || 'Hubo un problema al procesar tu carta.'
        });
      }
    } catch (error: any) {
      console.error('❌ Error confirming without mentor:', error);
      setErrorModal({
        show: true,
        title: '❌ Error de conexión',
        message: error.message || 'No se pudo conectar con el servidor.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1015]">
        <LoadingSpinner message="Cargando Objetivos." size="lg" />
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
      <div 
        className="border-b sticky top-0 z-50 backdrop-blur-lg"
        style={{ 
          background: `linear-gradient(to right, ${brandColor}15, ${brandColor}08)`,
          borderColor: `${brandColor}30`
        }}
      >
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
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                <Sparkles style={{ color: brandColor }} className="w-5 h-5 sm:w-6 sm:h-6" />
                Carta de Objetivos
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Múltiples acciones por área · Configuración individual</p>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end flex-wrap">
              {/* Botón configurar áreas (si NO pertenece a grupo, O si es FREE en nivel PL/Liderato) y está en BORRADOR */}
              {((!perteneceAGrupo) || (userTier === 'FREE' && userLevel === 'PL')) && estado === 'BORRADOR' && (
                <button
                  onClick={() => setShowAreaConfig(true)}
                  className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 transition whitespace-nowrap"
                  title="Configurar áreas personalizadas"
                >
                  <Settings size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Áreas</span> ({areasActivas.length})
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
                  className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors px-2 sm:px-3 py-1.5 rounded-lg border border-red-500/30 flex items-center gap-1.5 whitespace-nowrap"
                  title="Limpiar borrador del navegador"
                >
                  🗑️ <span className="hidden sm:inline">Limpiar</span>
                </button>
              )}
              
              <div className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap ${
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
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {WIZARD_STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1 min-w-[120px] sm:min-w-0">
                <button
                  onClick={() => {
                    if (step.id <= currentStep) setCurrentStep(step.id);
                  }}
                  disabled={step.id > currentStep}
                  className={`flex items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-xl flex-1 transition-all ${
                    currentStep > step.id
                      ? 'bg-green-600/20 text-green-400 cursor-pointer'
                      : currentStep < step.id 
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'text-white'
                  }`}
                  style={currentStep === step.id ? { backgroundColor: brandColor } : undefined}
                >
                  <span className="text-lg sm:text-2xl">{step.emoji}</span>
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-[10px] sm:text-xs font-bold truncate">{step.title}</div>
                    <div className="text-[9px] sm:text-xs opacity-75 truncate hidden sm:block">{step.subtitle}</div>
                  </div>
                  {currentStep > step.id && <Check size={14} className="ml-auto hidden sm:block sm:w-4 sm:h-4" />}
                </button>
                {idx < WIZARD_STEPS.length - 1 && (
                  <ChevronRight className="text-gray-600 mx-0.5 sm:mx-1 flex-shrink-0" size={16} />
                )}
              </div>
            ))}
          </div>

          {saving && (
            <div className="mt-2 text-xs flex items-center gap-1" style={{ color: brandColor }}>
              <Loader2 size={12} className="animate-spin" />
              Guardando...
            </div>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-6">
        {/* Paso 1: Declaración del Ser (NUEVO) */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div 
              className="rounded-lg p-3 sm:p-4 mb-4"
              style={{ 
                background: `linear-gradient(to right, ${brandColor}10, ${brandColor}05)`,
                border: `1px solid ${brandColor}30`
              }}
            >
              <div className="flex items-start gap-2">
                <div className="text-xl sm:text-2xl">🧘</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white mb-1.5">Antes de definir qué quieres tener, define quién quieres ser</h3>
                  <p className="text-xs text-gray-300 mb-3">
                    <strong>💡 Instrucción:</strong> Escribe en presente quién te comprometes ser para alcanzar tus metas. Todas las declaraciones DEBEN comenzar con <span style={{ color: brandColor }} className="font-bold">"Yo soy" + manera de SER</span>.
                  </p>
                  
                  {/* Botón Quantum Coach */}
                  <button
                    onClick={() => setShowQuantumSelectionModal(true)}
                    disabled={isReadOnly}
                    className="relative hover:opacity-90 
                             disabled:from-slate-700 disabled:to-slate-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold 
                             transition-all flex items-center gap-2 shadow-lg 
                             hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                             overflow-hidden group"
                    style={{ 
                      background: `linear-gradient(to right, ${brandColor}, ${brandColor}dd)`,
                      boxShadow: `0 10px 25px ${brandColor}30`
                    }}
                  >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Animated orb */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-white/30 rounded-full blur-sm opacity-50 animate-pulse"></div>
                      <Atom size={16} className="relative text-white animate-spin sm:w-5 sm:h-5" style={{ animationDuration: '8s' }} />
                    </div>
                    
                    <span className="relative">✨ ¿No sabes que escribir? Pide ayuda a QUANTUM</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal de Selección: Voz o Texto */}
            {showQuantumSelectionModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border-2 border-cyan-500/30 overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                    <div className="relative flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-cyan-300 rounded-full blur-xl opacity-50 animate-pulse"></div>
                        <Atom size={40} className="relative text-white animate-spin" style={{ animationDuration: '8s' }} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white">
                          🚀 Asistente QUANTUM
                        </h2>
                        <p className="text-cyan-100 text-sm">
                          Elige cómo quieres definir tu carta de frutos
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowQuantumSelectionModal(false)}
                      className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-8">
                    <p className="text-gray-300 text-center mb-8">
                      Selecciona tu método preferido para trabajar con QUANTUM
                    </p>

                    {/* Opciones */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Opción 1: VOZ - Mentor IA */}
                      <button
                        onClick={() => {
                          setShowQuantumSelectionModal(false);
                          window.location.href = '/dashboard/mentor-ia';
                        }}
                        className="group relative rounded-xl p-6 transition-all hover:scale-105 hover:shadow-2xl"
                        style={{
                          background: `linear-gradient(to bottom right, ${brandColor}40, ${brandColor}30)`,
                          border: `2px solid ${brandColor}50`
                        }}
                      >
                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(to bottom right, ${brandColor}20, ${brandColor}15)` }}></div>
                        
                        <div className="relative space-y-4">
                          {/* Icono */}
                          <div className="flex justify-center">
                            <div className="relative">
                              <div className="absolute inset-0 rounded-full blur-xl opacity-50 group-hover:opacity-70 transition-opacity" style={{ backgroundColor: brandColor }}></div>
                              <div className="relative p-4 rounded-full" style={{ background: `linear-gradient(to bottom right, ${brandColor}, ${brandColor}CC)` }}>
                                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Título */}
                          <div className="text-center">
                            <h3 className="text-xl font-black text-white mb-2">
                              🎤 Platicar por VOZ
                            </h3>
                            <p className="text-gray-200 text-sm">
                              Conversa con Quantum IA y define tus Objetivos de manera natural
                            </p>
                          </div>

                          {/* Badge */}
                          <div className="flex justify-center">
                            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: `${brandColor}30`, border: `1px solid ${brandColor}50`, color: 'white' }}>
                              BETA
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Opción 2: TEXTO - Quantum Wizard */}
                      <button
                        onClick={() => {
                          setShowQuantumSelectionModal(false);
                          setShowQuantumModal(true);
                        }}
                        className="group relative bg-gradient-to-br from-cyan-900/50 to-blue-900/50 hover:from-cyan-800/70 hover:to-blue-800/70 
                                 border-2 border-cyan-500/30 hover:border-cyan-400/60 rounded-xl p-6 transition-all hover:scale-105 
                                 hover:shadow-2xl hover:shadow-cyan-500/30"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative space-y-4">
                          {/* Icono */}
                          <div className="flex justify-center">
                            <div className="relative">
                              <div className="absolute inset-0 bg-cyan-500 rounded-full blur-xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
                              <div className="relative bg-gradient-to-br from-cyan-600 to-blue-600 p-4 rounded-full">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Título */}
                          <div className="text-center">
                            <h3 className="text-xl font-black text-white mb-2">
                              ✍️ Escribir TEXTO
                            </h3>
                            <p className="text-cyan-200 text-sm">
                              Responde preguntas y genera tu carta paso a paso
                            </p>
                          </div>

                          {/* Badge */}
                          <div className="flex justify-center">
                            <span className="bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-xs font-bold px-3 py-1 rounded-full">
                              RECOMENDADO
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <p className="text-gray-400 text-sm text-center">
                        💡 <strong className="text-white">Tip:</strong> Si es tu primera vez, te recomendamos <strong style={{ color: brandColor }}>VOZ</strong> para una experiencia más natural
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

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

            {(() => {
              // Filtrar áreas de servicio si el usuario no es PL
              const areasVisiblesStep1 = userLevel === 'PL' 
                ? areasActivas 
                : areasActivas.filter(a => a.key !== 'servicioTrans' && a.key !== 'servicioComun');
              
              return areasVisiblesStep1.map((area) => {
                const fieldValue = declaracionesSer[area.key] || '';
                const isValid = validateYoSoy(fieldValue);
                const showValidation = fieldValue.trim().length > 0;
                
                return (
                  <div 
                    key={area.key} 
                    className="bg-[#1a1b1f] border-2 border-gray-800 rounded-xl p-5 transition-all"
                    style={{ ['--hover-border' as string]: `${brandColor}50` }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = `${brandColor}50`}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = ''}
                  >
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
                      'border border-gray-700'
                    }`}
                    style={{ ...(!(isReadOnly || (showValidation && !isValid) || (showValidation && isValid)) && { '--tw-ring-color': brandColor } as React.CSSProperties) }}
                    rows={3}
                  />
                </div>
              );
            });
            })()}
          </div>
        )}

        {/* Paso 2: Identidades (Múltiples) */}
        {currentStep === 2 && (() => {
          // Filtrar áreas de servicio si el usuario no es PL (solo PL = Liderato)
          const areasVisiblesStep2 = userLevel === 'PL' 
            ? areasActivas 
            : areasActivas.filter(a => a.key !== 'servicioTrans' && a.key !== 'servicioComun');
          
          return (
          <div className="space-y-6">
            {/* Sugerencia Inteligente del Coach */}
            {showSmartSuggestion && (
              <div className="rounded-xl p-4 animate-in slide-in-from-top-5 shadow-lg" style={{ background: `linear-gradient(to right, ${brandColor}30, ${brandColor}20, ${brandColor}30)`, border: `2px solid ${brandColor}80` }}>
                <div className="flex items-start gap-3">
                  <div className="text-3xl">🤖</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm uppercase mb-1" style={{ color: brandColor }}>
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

            <div className="rounded-xl p-6 mb-6" style={{ background: `linear-gradient(to right, ${brandColor}15, ${brandColor}10, ${brandColor}15)`, border: `1px solid ${brandColor}50` }}>
              <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                Definición del Objetivo
              </h3>
              <p className="text-sm text-gray-200 mb-4">
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

            {areasVisiblesStep2.map((area) => (
              <div key={area.key} className="bg-[#1a1b1f] border-2 border-gray-800 rounded-xl p-4 sm:p-6">
                {/* Botón de sugerencias QUANTUM */}
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span className="text-2xl">{area.emoji}</span>
                    {area.name}
                  </h3>
                  {!isReadOnly && area.key !== 'servicioTrans' && (
                    <button
                      onClick={() => handleGetSuggestions(area.key)}
                      disabled={loadingSuggestions === area.key}
                      className="group relative w-full sm:w-auto px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ 
                        background: `linear-gradient(to right, ${brandColor}20, ${brandColor}15)`,
                        border: `1px solid ${brandColor}50`
                      }}
                    >
                      <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-medium">
                        {loadingSuggestions === area.key ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" style={{ color: brandColor }} />
                            <span style={{ color: brandColor }}>Generando...</span>
                          </>
                        ) : (
                          <>
                            <Atom className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" style={{ color: brandColor }} />
                            <span style={{ color: brandColor }}>💡 Sugerir logros</span>
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
                  placeholder={area.key === 'servicioTrans' && objetivoInvitados 
                    ? `Enrolar a ${objetivoInvitados} personas` 
                    : "Usa la Fórmula de Poder: Verbo de Acción + Resultado Exacto (Cantidad/Número/Métrica)"}
                  maxMetas={5}
                  isReadOnly={isReadOnly || (area.key === 'servicioTrans' && objetivoInvitados !== null)}
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
        );
        })()}

        {/* Paso 3: Metas Dinámicas - ITERATIVO POR OBJETIVO */}
        {currentStep === 3 && (
          <div className="space-y-6 pb-32">
            {objetivosFlattened.length === 0 ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
                <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
                <p className="text-red-400 font-bold mb-2">Sin objetivos definidos</p>
                <p className="text-gray-300 text-sm">Regresa al Paso 2 para agregar al menos un objetivo por área</p>
              </div>
            ) : currentObjetivoData ? (
              <>
                {/* Header con info del objetivo actual */}
                <div className="rounded-xl p-6" style={{ background: `linear-gradient(to right, ${brandColor}40, ${brandColor}30, ${brandColor}40)`, border: `2px solid ${brandColor}80` }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{currentObjetivoData.areaEmoji}</span>
                      <div>
                        <h3 className="text-xl font-bold text-white">{currentObjetivoData.areaName}</h3>
                        <p className="text-sm" style={{ color: brandColor }}>
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
                  <div className="bg-black/30 rounded-lg p-4" style={{ border: `1px solid ${brandColor}50` }}>
                    <p className="text-xs mb-1" style={{ color: brandColor }}>TU OBJETIVO:</p>
                    <p className="text-lg text-white font-medium">{currentObjetivoData.objetivo.description}</p>
                  </div>
                </div>

                {/* Verificar si es Servicio Transformacional */}
                {currentObjetivoData.areaKey === 'servicioTrans' ? (
                  /* Mensaje especial para Servicio Transformacional */
                  <div className="bg-gradient-to-r from-amber-900/20 via-yellow-900/20 to-amber-900/20 border-2 border-amber-500/50 rounded-xl p-6 mb-4">
                    <div className="flex items-start gap-4">
                      <div className="text-5xl">✨</div>
                      <div className="flex-1">
                        <h4 className="text-amber-300 font-bold text-lg mb-2">Este objetivo no requiere acciones específicas</h4>
                        <p className="text-amber-100 text-sm leading-relaxed mb-3">
                          Este objetivo trata de <strong>tu SER</strong> - quién estás siendo para obtenerlo. 
                          No se trata de acciones específicas, sino de la identidad y el estado del ser que encarnas.
                        </p>
                        <div className="bg-black/30 rounded-lg p-3 border border-amber-500/30">
                          <p className="text-xs text-amber-200">
                            💡 <strong>Enfócate en:</strong> La persona en la que te estás convirtiendo, no en las tareas que debes hacer.
                          </p>
                        </div>
                        
                        {/* Mostrar tareas auto-generadas (ocultas visualmente pero ya creadas) */}
                        {metasPorArea[currentObjetivoData.objetivo.id]?.length > 0 && (
                          <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                            <p className="text-green-300 text-sm">
                              ✅ {metasPorArea[currentObjetivoData.objetivo.id].length} tarea{metasPorArea[currentObjetivoData.objetivo.id].length !== 1 ? 's' : ''} de enrolamiento generada{metasPorArea[currentObjetivoData.objetivo.id].length !== 1 ? 's' : ''} automáticamente
                            </p>
                            <p className="text-green-200 text-xs mt-1">
                              Configurarás la frecuencia en el siguiente paso
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Instrucciones normales */}
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
                          <div className="rounded-lg p-4" style={{ background: `linear-gradient(to right, ${brandColor}30, ${brandColor}20, ${brandColor}30)`, border: `1px solid ${brandColor}60` }}>
                            <div className="flex items-center gap-3">
                              <Atom className="w-6 h-6 animate-spin" style={{ animationDuration: '2s', color: brandColor }} />
                              <div>
                                <p className="font-medium text-sm" style={{ color: brandColor }}>QUANTUM generando posibilidades de acción...</p>
                              </div>
                            </div>
                          </div>
                        ) : actionSuggestionsByObjetivo[currentObjetivoData.objetivo.id]?.length > 0 ? (
                          <div className="rounded-lg p-4" style={{ background: `linear-gradient(to right, ${brandColor}15, ${brandColor}10, ${brandColor}15)`, border: `1px solid ${brandColor}50` }}>
                            <div className="flex items-center gap-2 mb-3">
                              <Atom className="w-5 h-5" style={{ color: brandColor }} />
                              <h4 className="font-bold text-sm" style={{ color: brandColor }}>💡 Sugerencias de QUANTUM</h4>
                            </div>
                            
                            <div className="space-y-2">
                              {actionSuggestionsByObjetivo[currentObjetivoData.objetivo.id].map((suggestion, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleSelectActionSuggestionInline(suggestion, currentObjetivoData.objetivo.id)}
                                  className="group w-full text-left bg-gray-800/50 border border-gray-700 rounded-lg p-3 transition-all duration-200 hover:scale-[1.01]"
                                  style={{ ['--hover-bg' as string]: `${brandColor}30`, ['--hover-border' as string]: `${brandColor}80` }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = `${brandColor}20`;
                                    e.currentTarget.style.borderColor = `${brandColor}80`;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '';
                                    e.currentTarget.style.borderColor = '';
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs group-hover:scale-110 transition-transform" style={{ background: `linear-gradient(to bottom right, ${brandColor}, ${brandColor}AA)` }}>
                                      {index + 1}
                                    </div>
                                    <p className="text-white text-sm leading-snug transition-colors flex-1">
                                      {suggestion}
                                    </p>
                                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: brandColor }} />
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
                  </>
                )}

                {/* Navegación entre objetivos - FIJO EN MÓVIL */}
                <div className="fixed bottom-0 left-0 right-0 bg-[#0a0b0d]/95 backdrop-blur-sm border-t border-gray-800 px-4 py-4 z-50">
                  {/* Barra de progreso compacta */}
                  <div className="mb-3 max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Progreso</span>
                      <span className="text-xs font-bold" style={{ color: brandColor }}>
                        {currentObjetivoData.index} / {currentObjetivoData.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all"
                        style={{ 
                          width: `${(currentObjetivoData.index / currentObjetivoData.total) * 100}%`,
                          backgroundColor: brandColor
                        }}
                      />
                    </div>
                  </div>

                  {/* Botones de navegación */}
                  <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
                    <button
                      onClick={handlePrevObjetivo}
                      disabled={currentObjetivoIndexStep3 === 0}
                      className="px-4 py-3 bg-gray-800 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
                    >
                      <ChevronLeft size={20} />
                      <span className="hidden sm:inline">Atrás</span>
                    </button>

                    <button
                      onClick={handleNextObjetivo}
                      className="flex-1 sm:flex-none px-6 py-3 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                      style={{ 
                        backgroundColor: brandColor,
                        boxShadow: `0 10px 25px ${brandColor}30`
                      }}
                    >
                      {currentObjetivoIndexStep3 < objetivosFlattened.length - 1 ? (
                        <>
                          Siguiente
                          <ChevronRight size={20} />
                        </>
                      ) : (
                        <>
                          Continuar
                          <ChevronRight size={20} />
                        </>
                      )}
                    </button>
                  </div>
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
                    <div className="rounded-xl p-4 mb-6" style={{ background: `linear-gradient(to right, ${brandColor}40, ${brandColor}30, ${brandColor}40)`, border: `2px solid ${brandColor}80` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{currentMetaData.areaEmoji}</span>
                        <div className="flex-1">
                          <p className="text-xs" style={{ color: brandColor }}>OBJETIVO:</p>
                          <p className="text-sm text-white font-medium">{currentMetaData.objetivoDescription}</p>
                        </div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-3" style={{ border: `1px solid ${brandColor}50` }}>
                        <p className="text-xs mb-1" style={{ color: brandColor }}>ACCIÓN A CONFIGURAR:</p>
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
                      visionEndDate={visionEndDate}
                      initialConfig={(() => {
                        const config = metasConfiguradas.find(mc => mc.metaId === currentMetaData.meta.id)?.config;
                        console.log('🔍 Buscando config para:', currentMetaData.meta.id);
                        console.log('📋 Configs disponibles:', metasConfiguradas);
                        console.log('✅ Config encontrado:', config);
                        return config;
                      })()}
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
                    <span className="text-sm text-gray-400">Progreso de revisión</span>
                    <span className="text-sm font-bold" style={{ color: brandColor }}>
                      {accionesRevisadas.size} de {metasFlattened.length} {accionesRevisadas.size < metasFlattened.length ? 'revisadas' : 'completadas'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all"
                      style={{ 
                        width: `${(accionesRevisadas.size / metasFlattened.length) * 100}%`,
                        backgroundColor: brandColor
                      }}
                    />
                  </div>
                  {accionesRevisadas.size < metasFlattened.length && (
                    <p className="text-xs text-yellow-400 mt-2">
                      ⚠️ Faltan {metasFlattened.length - accionesRevisadas.size} acciones por revisar. Navega con las flechas para completarlas.
                    </p>
                  )}
                </div>

                {/* Mensaje de éxito cuando todas las metas están configuradas Y revisadas */}
                {metasConfiguradas.length === metasFlattened.length && 
                 accionesRevisadas.size === metasFlattened.length && (
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
                            📊 <strong>Resumen:</strong> {metasFlattened.length} acciones configuradas en {(userLevel === 'PL' ? areasActivas : areasActivas.filter(a => a.key !== 'servicioTrans' && a.key !== 'servicioComun')).length} áreas de vida
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
                              {estado === 'BORRADOR' ? 'Enviar Objetivos al Mentor →' : 'Actualizar Carta →'}
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

        {/* Paso 5: Foto de Perfil */}
        {currentStep === 5 && (
          <div className="space-y-4 sm:space-y-6">
            {loadingAvatar ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 sm:p-12 text-center">
                <div className="flex flex-col items-center gap-4 sm:gap-6">
                  <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 animate-spin" style={{ color: brandColor }} />
                  <p className="text-lg sm:text-xl text-white">Cargando perfil...</p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 sm:p-6 md:p-8 text-center">
                <div className="flex flex-col items-center gap-4 sm:gap-6">
                  <div 
                    className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${brandColor}30` }}
                  >
                    <Sparkles className="text-white" size={32} style={{ color: brandColor }} />
                  </div>
                  
                  <div className="space-y-2 sm:space-y-3">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                      Crea tu Foto de Perfil
                    </h2>
                    <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto px-2">
                      {hasAvatar 
                        ? '¡Ya tienes tu foto de perfil! Puedes guardarla o generar una nueva.' 
                        : 'Genera tu foto de perfil personalizada con IA para completar tu carta.'
                      }
                    </p>
                  </div>

                  {hasAvatar ? (
                    <div className="flex flex-col items-center gap-3 sm:gap-4">
                      {/* Mostrar el avatar generado */}
                      {avatarUrl && (
                        <div className="relative group">
                          <div className="absolute inset-0 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(to right, ${brandColor}, ${brandColor}CC, ${brandColor})` }}></div>
                          <img 
                            src={avatarUrl} 
                            alt="Tu Avatar" 
                            className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-2xl object-cover border-4 shadow-2xl"
                            style={{ borderColor: `${brandColor}80`, boxShadow: `0 25px 50px -12px ${brandColor}80` }}
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/50 rounded-lg px-4 sm:px-6 py-2 sm:py-3">
                        <CheckCircle2 className="text-green-400" size={20} />
                        <span className="text-sm sm:text-base text-green-300 font-bold">Avatar Generado</span>
                      </div>
                      <button
                        onClick={() => setShowAvatarModal(true)}
                        className="px-4 sm:px-6 py-2 sm:py-3 hover:opacity-90 text-white rounded-xl font-bold transition-all flex items-center gap-2 text-sm sm:text-base"
                        style={{ backgroundColor: brandColor }}
                      >
                        <Sparkles size={18} />
                        Regenerar Avatar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAvatarModal(true)}
                      className="px-6 sm:px-8 py-3 sm:py-4 hover:opacity-90 text-white rounded-xl font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg"
                      style={{ 
                        backgroundColor: brandColor,
                        boxShadow: `0 10px 25px ${brandColor}50`
                      }}
                    >
                      <Sparkles size={20} />
                      Crear
                    </button>
                  )}
                </div>
              </div>
            )}


          </div>
        )}
      </div>

      {/* NAVIGATION FOOTER */}
      {!isReadOnly && currentStep !== 3 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#1a1b1f] border-t border-gray-800 p-3 sm:p-4 z-50">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              if (currentStep === 5) {
                // Si estamos en Paso 5, regresar al Paso 4
                setCurrentStep(4);
                setCurrentMetaIndex(metasFlattened.length - 1); // Ir a la última meta
              } else if (currentStep === 4 && currentMetaIndex > 0) {
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
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-800 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm sm:text-base"
          >
            <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Anterior</span>
            <span className="sm:hidden">Atrás</span>
          </button>

          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-400">
              {currentStep < 4 ? `Paso ${currentStep} de 5` : currentStep === 4 ? `Meta ${currentMetaIndex + 1} de ${metasFlattened.length}` : 'Paso 5 de 5'}
            </p>
            <div className="flex gap-1 sm:gap-2 justify-center mt-1 sm:mt-2">
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${validateStep1() ? 'bg-green-500' : 'bg-gray-600'}`} />
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${validateStep2() ? 'bg-green-500' : 'bg-gray-600'}`} />
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${validateStep3() ? 'bg-green-500' : 'bg-gray-600'}`} />
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${validateStep4() ? 'bg-green-500' : 'bg-gray-600'}`} />
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${hasAvatar ? 'bg-green-500' : 'bg-gray-600'}`} />
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
              className="px-6 py-3 text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: brandColor }}
            >
              Siguiente
              <ChevronRight size={20} />
            </button>
          ) : currentStep === 4 ? (
            // En el paso 4, mostrar botón de "Siguiente" para ir al paso 5
            <button
              onClick={async () => {
                if (canAdvanceToStep5()) {
                  setCurrentStep(5);
                  // Guardar en BD que llegó al paso 5 (carta prellenada)
                  try {
                    await fetch('/api/carta/my-carta', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ wizardStep: 5 })
                    });
                    console.log('✅ Carta marcada como prellenada (paso 5)');
                  } catch (e) {
                    console.error('Error guardando wizardStep:', e);
                  }
                } else {
                  alert('⚠️ Completa la configuración de todas las acciones antes de continuar.');
                }
              }}
              disabled={!canAdvanceToStep5()}
              className="px-6 py-3 text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: brandColor }}
            >
              Siguiente
              <ChevronRight size={20} />
            </button>
          ) : (
            // En el paso 5:
            // - BASIC/ADVANCED: Solo mostrar mensaje de "Carta Completada" (no tienen mentor)
            // - PL: Mostrar botón "Enviar para Revisión"
            <div className="flex items-center gap-2 sm:gap-3">
              {/* 
                LÓGICA POR NIVEL:
                - BASIC/ADVANCED: No pueden enviar a revisión (no tienen mentor asignado)
                  → Mostrar mensaje de éxito cuando completen el avatar
                - PL: Pueden enviar a revisión
                  → Mostrar botón de enviar
              */}
              {(userLevel === 'BASIC' || userLevel === 'ADVANCED') ? (
                // Usuarios BASIC/ADVANCED - Solo completar carta, sin enviar
                hasAvatar ? (
                  <div className="flex items-center gap-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/50 rounded-xl px-4 sm:px-6 py-2 sm:py-3">
                    <CheckCircle2 className="text-green-400 w-5 h-5 sm:w-6 sm:h-6" />
                    <div>
                      <p className="text-green-300 font-bold text-sm sm:text-base">¡Carta Completada!</p>
                      <p className="text-green-200 text-xs sm:text-sm">Tu avatar ha sido generado. Tu carta está lista.</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] sm:text-xs text-yellow-400 max-w-xs">
                    ⚠️ Genera tu Avatar para completar la carta
                  </div>
                )
              ) : (
                // Usuarios PL - Pueden enviar a revisión
                (() => {
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
                  shouldEnable,
                  userLevel
                });
                
                return (
                  <>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !shouldEnable}
                      className={`px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:scale-105 disabled:cursor-not-allowed transition-all text-sm sm:text-base ${buttonOpacity}`}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin sm:w-5 sm:h-5" />
                          <span className="hidden sm:inline">Consultando Licencia espere un momento...</span>
                          <span className="sm:hidden">Enviando Espere...</span>
                        </>
                      ) : (
                        <>
                          <Check size={18} className="sm:w-5 sm:h-5" />
                          <span className="hidden sm:inline">{estado === 'BORRADOR' ? 'Enviar para Revisión' : 'Reenviar Cambios'}</span>
                          <span className="sm:hidden">Enviar</span>
                        </>
                      )}
                    </button>
                    
                    {/* Indicador visual de validación */}
                    {!allStepsValid && (
                      <div className="text-[10px] sm:text-xs text-yellow-400 max-w-xs">
                        ⚠️ Completa todos los pasos:
                        {!validateStep1() && <div>• Paso 1: Declaraciones del Ser</div>}
                        {!validateStep2() && <div>• Paso 2: Objetivos</div>}
                        {!validateStep3() && <div>• Paso 3: Acciones SMART</div>}
                        {!validateStep4() && <div>• Paso 4: Plan de Acción ({metasConfiguradas.length}/{totalAcciones})</div>}
                        {!hasAvatar && <div>• Paso 5: Perfil</div>}
                      </div>
                    )}
                    {allStepsValid && estado !== 'BORRADOR' && !hasChanges && (
                      <p className="text-xs text-gray-500 max-w-xs">
                        ℹ️ Realiza cambios para habilitar el reenvío
                      </p>
                    )}
                  </>
                );
              })()
              )}
              
              {/* Mostrar estado de progreso mientras se configuran las metas */}
              {userLevel === 'PL' && !validateStep3() && (
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4 animate-in fade-in">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto" style={{ border: `2px solid ${brandColor}80` }}>
            <div className="flex flex-col items-center text-center gap-3 sm:gap-4">
              <div className={`text-4xl sm:text-5xl md:text-6xl ${errorModal.title.includes('✅') ? 'animate-bounce' : 'animate-pulse'}`}>
                {errorModal.title.includes('🗑️') ? '🗑️' : errorModal.title.includes('✅') ? '🎉' : '⚠️'}
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                {errorModal.title}
              </h3>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed whitespace-pre-line">
                {errorModal.message}
              </p>
              
              {/* Botones especiales para confirmación de limpiar borrador */}
              {errorModal.title.includes('🗑️') ? (
                <div className="flex gap-2 sm:gap-3 w-full mt-2">
                  <button
                    onClick={() => setErrorModal({ show: false, title: '', message: '' })}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-xl transition-all text-sm sm:text-base"
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
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:shadow-lg hover:scale-105 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-xl transition-all text-sm sm:text-base"
                  >
                    Sí, Limpiar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setErrorModal({ show: false, title: '', message: '' })}
                  className="mt-2 sm:mt-4 w-full hover:shadow-lg hover:scale-105 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-xl transition-all text-sm sm:text-base"
                  style={{ backgroundColor: brandColor }}
                >
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL DE CONFIRMACIÓN SIN MENTOR - Usuarios FREE Graduados */}
      {showNoMentorConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4 animate-in fade-in">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-amber-500/50 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center gap-3 sm:gap-4">
              <div className="text-4xl sm:text-5xl md:text-6xl animate-pulse">
                🎓
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                No tienes Mentor Asignado
              </h3>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                Como usuario graduado con cuenta FREE, actualmente no tienes un mentor asignado para revisar tu carta.
              </p>
              
              {/* Opción 1: Contratar paquete */}
              <div className="w-full rounded-xl p-4 mt-2" style={{ background: `linear-gradient(to right, ${brandColor}40, ${brandColor}30)`, border: `1px solid ${brandColor}50` }}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📞</span>
                  <h4 className="text-white font-bold text-left">Opción 1: Contratar Mentor</h4>
                </div>
                <p className="text-gray-300 text-sm text-left mb-3">
                  Adquiere un paquete de llamadas y obtén acompañamiento personalizado de un mentor certificado.
                </p>
                <button
                  onClick={() => {
                    setShowNoMentorConfirmModal(false);
                    window.location.href = '/dashboard/suscripcion';
                  }}
                  className="w-full hover:shadow-lg hover:scale-[1.02] text-white font-bold py-2.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                  style={{ backgroundColor: brandColor }}
                >
                  <span>💎</span>
                  Ver Paquetes de Llamadas
                </button>
              </div>
              
              {/* Opción 2: Continuar sin mentor */}
              <div className="w-full bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🚀</span>
                  <h4 className="text-white font-bold text-left">Opción 2: Continuar Solo</h4>
                </div>
                <p className="text-gray-300 text-sm text-left mb-3">
                  Tu carta será aprobada automáticamente y se generarán todas tus tareas sin revisión de mentor.
                </p>
                <button
                  onClick={handleConfirmWithoutMentor}
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:shadow-lg hover:scale-[1.02] text-white font-bold py-2.5 px-4 rounded-xl transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      Continuar sin Mentor
                    </>
                  )}
                </button>
              </div>
              
              {/* Botón cancelar */}
              <button
                onClick={() => setShowNoMentorConfirmModal(false)}
                disabled={submitting}
                className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 px-4 rounded-xl transition-all text-sm disabled:opacity-50 mt-1"
              >
                Cancelar
              </button>
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4 animate-in fade-in">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-3xl w-full p-4 sm:p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto" style={{ border: `2px solid ${brandColor}80` }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <Atom className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" style={{ animationDuration: '3s', color: brandColor }} />
                  <div className="absolute inset-0 blur-xl rounded-full" style={{ backgroundColor: `${brandColor}30` }}></div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white truncate">QUANTUM Estratega</h3>
                  <p className="text-xs sm:text-sm truncate" style={{ color: brandColor }}>Objetivos de Alto Impacto - {AREAS.find(a => a.key === showSuggestionsModal.area)?.name}</p>
                </div>
              </div>
              <button
                onClick={handleCloseQuantumModal}
                className="text-gray-400 hover:text-white transition-colors flex-shrink-0 ml-2"
              >
                <span className="text-xl sm:text-2xl">✕</span>
              </button>
            </div>

            {/* Instrucciones */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
              <p className="text-blue-200 text-xs sm:text-sm">
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
                        : 'bg-gradient-to-r from-gray-800 to-gray-800/50 border-gray-700 hover:scale-[1.02] hover:shadow-lg'
                    }`}
                    style={!isSelected ? { 
                      ['--hover-border' as string]: `${brandColor}50`
                    } : undefined}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = `${brandColor}50`;
                        e.currentTarget.style.background = `linear-gradient(to right, ${brandColor}15, ${brandColor}10)`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '';
                        e.currentTarget.style.background = '';
                      }
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm transition-transform ${
                          isSelected ? 'bg-green-500' : 'group-hover:scale-110'
                        }`}
                        style={!isSelected ? { backgroundColor: brandColor } : undefined}
                      >
                        {isSelected ? '✓' : index + 1}
                      </div>
                      <div className="flex-1">
                        <p className={`text-base leading-relaxed transition-colors ${
                          isSelected
                            ? 'text-green-200'
                            : 'text-white'
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
                          : 'opacity-0 group-hover:opacity-100'
                      }`} style={!isSelected ? { color: brandColor } : undefined}>
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
                className="px-6 py-3 hover:opacity-90 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-lg"
                style={{ backgroundColor: brandColor }}
              >
                Listo, continuar
              </button>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-gray-400 text-sm text-center">
                ✨ Estas sugerencias están diseñadas con la <strong style={{ color: brandColor }}>Fórmula de Poder</strong>: Acción + Resultado Medible<br/>
                <span className="text-xs text-gray-500">Las fechas y frecuencias se definirán en los siguientes pasos</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SUGERENCIAS QUANTUM PARA ACCIONES (PASO 3) */}
      {showActionSuggestionsModal.show && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-3xl w-full p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto" style={{ border: `2px solid ${brandColor}80` }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Atom className="w-10 h-10 animate-spin" style={{ animationDuration: '3s', color: brandColor }} />
                  <div className="absolute inset-0 blur-xl rounded-full" style={{ backgroundColor: `${brandColor}30` }}></div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">QUANTUM Estratega</h3>
                  <p className="text-sm" style={{ color: brandColor }}>Acciones SMART para tu objetivo</p>
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
                        : 'bg-gradient-to-r from-gray-800 to-gray-800/50 border-gray-700 hover:scale-[1.02] hover:shadow-lg'
                    }`}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = `${brandColor}50`;
                        e.currentTarget.style.background = `linear-gradient(to right, ${brandColor}15, ${brandColor}10)`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '';
                        e.currentTarget.style.background = '';
                      }
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm transition-transform ${
                          isSelected ? 'bg-green-500' : 'group-hover:scale-110'
                        }`}
                        style={!isSelected ? { backgroundColor: brandColor } : undefined}
                      >
                        {isSelected ? '✓' : index + 1}
                      </div>
                      <div className="flex-1">
                        <p className={`text-base leading-relaxed transition-colors ${
                          isSelected
                            ? 'text-green-200'
                            : 'text-white'
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
                          : 'opacity-0 group-hover:opacity-100'
                      }`} style={!isSelected ? { color: brandColor } : undefined}>
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
                className="px-6 py-3 hover:opacity-90 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-lg"
                style={{ backgroundColor: brandColor }}
              >
                Listo, continuar
              </button>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-gray-400 text-sm text-center">
                ✨ Estas acciones están diseñadas con <strong style={{ color: brandColor }}>criterios SMART</strong><br/>
                <span className="text-xs text-gray-500">Específicas, Medibles, Alcanzables, Relevantes</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Avatar Cuántico */}
      <QuantumIdentityModal
        isOpen={showAvatarModal}
        onClose={async () => {
          console.log('🔄 Modal cerrado, recargando datos del avatar...');
          setShowAvatarModal(false);
          setLoadingAvatar(true);
          
          // Pequeña espera para asegurar que la BD se actualizó
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            // Obtener directamente el avatar del usuario
            const res = await fetch(`/api/carta/my-carta?nocache=${Date.now()}`);
            if (res.ok) {
              const data = await res.json();
              console.log('📥 Datos después de crear avatar:', data);
              
              if (data.carta?.Usuario?.profileImage) {
                setHasAvatar(true);
                setAvatarUrl(data.carta.Usuario.profileImage);
                console.log('✅ Avatar actualizado:', data.carta.Usuario.profileImage);
              } else {
                console.warn('⚠️ No se encontró profileImage en la respuesta');
              }
            }
            
            // Recargar el resto de los datos
            await loadCarta();
          } catch (error) {
            console.error('❌ Error recargando avatar:', error);
          } finally {
            setLoadingAvatar(false);
          }
        }}
        userName={userEmail || 'Usuario'}
        userLevel={1}
        userRank="Novato"
        skipReload={true} // NO recargar la página, mantener el estado del wizard
        brandColor={brandColor}
      />
    </div>
  );
}
