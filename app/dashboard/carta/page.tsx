'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Heart, Star, Zap, Smile, HeartPulse, 
  Users, TrendingUp, Lock, CheckSquare, Square, AlertTriangle, 
  X, Sparkles, Save, Loader2, CheckCircle2, Bot, Pencil, Unlock, XCircle, Clock, Check
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Mapeo de días para el modal
const DAYS_OF_WEEK = [
  { id: 'lunes', label: 'Lunes' },
  { id: 'martes', label: 'Martes' },
  { id: 'miércoles', label: 'Miércoles' },
  { id: 'jueves', label: 'Jueves' },
  { id: 'viernes', label: 'Viernes' },
  { id: 'sábado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' },
];

const CATEGORIAS = [
  { id: 'FINANZAS', label: 'Finanzas', icon: DollarSign, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  { id: 'RELACIONES', label: 'Relaciones', icon: Heart, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
  { id: 'TALENTOS', label: 'Talentos', icon: Star, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  { id: 'PAZ_MENTAL', label: 'Paz Mental', icon: Zap, color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
  { id: 'OCIO', label: 'Diversión/Ocio', icon: Smile, color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
  { id: 'SALUD', label: 'Salud', icon: HeartPulse, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  // 🚨 TRANSFORMACIÓN (ELIMINADA)
  { id: 'COMUNIDAD', label: 'Comunidad', icon: Users, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  { id: 'ENROLAMIENTO', label: 'Enrolamiento', icon: TrendingUp, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
];

// PARSER DE METAS: Analiza el texto para detectar cuantificación y recurrencia
const parseGoalForTasks = (text: string) => {
  const normalizedText = text.toLowerCase();
  
  // 0. 🔥 NUEVO: Detectar "todos los días" o "diariamente"
  const isDaily = /todos los dias|todos los días|diario|diariamente|cada dia|cada día/.test(normalizedText);
  
  // 🔥 NUEVO: Detectar "X veces al día" (múltiples veces diarias)
  const multiplePerDayMatch = normalizedText.match(/(\d+)\s*(veces|vez)\s*(al dia|al día|por dia|por día|diarias|diarios)/);
  const isMultiplePerDay = multiplePerDayMatch !== null;
  const timesPerDay = multiplePerDayMatch ? parseInt(multiplePerDayMatch[1]) : null;
  
  // 1. Extraer el número de veces (ej: "3 veces" → 3)
  const numberMatch = normalizedText.match(/(\d+)\s*(veces|vez|dias|día)/);
  const requiredCount = numberMatch ? parseInt(numberMatch[1]) : (isDaily ? 7 : null);
  
  // 2. Detectar si es mensual, semanal o anual
  const isMonthly = /al mes|mensual|mensuales|por mes/.test(normalizedText);
  const isWeekly = /semana|semanal|semanales|por semana|a la semana/.test(normalizedText) || (isDaily && !isMultiplePerDay);
  const isAnnual = /al año|anual|anuales|por año|cada año/.test(normalizedText);
  
  // 3. Buscamos números (proxy para cuantificación)
  const hasNumber = /\d/.test(normalizedText) || isDaily;
  
  // 4. Buscamos frecuencia (LISTA AMPLIADA DE RECURRENCIA)
  const recurrenceKeywords = [
      'veces', 'dias', 'dia', 'semana', 'semanal', 'semanales',
      'al mes', 'mensual', 'mensuales', 'mes',
      'quincena', 'quincenal', 'quincenales', 'cada 15 dias',
      'al dia', 'diario', 'diarios', 'diariamente',
      'lunes', 'martes', 'miercoles', 'miércoles', 'jueves', 'viernes', 'sabado', 'sábado', 'domingo',
      'cada', 'todos los', 'todas las',
      'por semana', 'a la semana', 'por mes', 'al año', 'anual', 'anuales',
  ];

  const isRecurrent = recurrenceKeywords.some(keyword => normalizedText.includes(keyword)) || isDaily;

  // Si tiene un número Y una palabra de frecuencia, es medible
  const isQuantifiableAndRecurrent = hasNumber && isRecurrent;

  let recurrenceRule = null;
  if (isQuantifiableAndRecurrent) {
      // Indicamos al sistema que esta meta tiene una recurrencia que necesita ser chequeada
      recurrenceRule = 'DAILY_CHECK_IN'; 
  }

  return {
    isQuantifiableAndRecurrent,
    recurrenceRule,
    requiredCount, // 🔥 NUEVO: Número de veces requerido (7 si es diario)
    isMonthly,     // 🔥 NUEVO: Es frecuencia mensual
    isWeekly,      // 🔥 NUEVO: Es frecuencia semanal
    isDaily,       // 🔥 NUEVO: Es tarea diaria (todos los días)
    isMultiplePerDay, // 🔥 NUEVO: Múltiples veces al día
    timesPerDay,   // 🔥 NUEVO: Cuántas veces al día
    isAnnual,      // 🔥 NUEVO: Es frecuencia anual (NO permitido)
  };
};

// 🚨 FUNCIÓN DE FILTRADO THINGS-LIKE
// Esta función determina si una tarea debe mostrarse HOY basándose en:
// 1. Si está programada para hoy (día de la semana)
// 2. Si está vencida (programada para días anteriores y no completada)
// 3. Si fue completada hoy (ya no se muestra)
const shouldShowTaskToday = (tarea: any): boolean => {
  // Si no tiene días programados, no la mostramos (o puedes decidir mostrarla siempre)
  if (!tarea.scheduledDays || tarea.scheduledDays.length === 0) {
    return false; // O cambiar a `true` si quieres mostrar tareas sin programación
  }

  const today = new Date();
  const todayDayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][today.getDay()];
  
  // Si está programada para hoy
  const isScheduledToday = tarea.scheduledDays.map((d: string) => d.toLowerCase()).includes(todayDayName);
  
  // Si fue completada hoy, no la mostramos
  if (tarea.lastCompletedDate) {
    const lastCompleted = new Date(tarea.lastCompletedDate);
    const isSameDay = lastCompleted.toDateString() === today.toDateString();
    if (isSameDay) {
      return false; // Ya la completó hoy
    }
  }
  
  // Mostrar si está programada para hoy
  if (isScheduledToday) {
    return true;
  }
  
  // Verificar si está vencida (programada para días anteriores de esta semana y no completada)
  const dayOrder = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const todayIndex = dayOrder.indexOf(todayDayName);
  
  for (const scheduledDay of tarea.scheduledDays) {
    const scheduledDayIndex = dayOrder.indexOf(scheduledDay.toLowerCase());
    
    // Si el día programado es anterior en la semana y no está completada
    if (scheduledDayIndex < todayIndex) {
      // Verificar si fue completada en ese día
      if (!tarea.lastCompletedDate) {
        return true; // Está vencida
      }
      
      const lastCompleted = new Date(tarea.lastCompletedDate);
      const scheduledDate = new Date(today);
      scheduledDate.setDate(today.getDate() - (todayIndex - scheduledDayIndex));
      
      if (lastCompleted < scheduledDate) {
        return true; // Está vencida
      }
    }
  }
  
  return false;
};

// 🚨 FUNCIÓN AUXILIAR: Filtrar todas las tareas de la carta que deben mostrarse hoy
const getTasksForToday = (datos: any): any[] => {
  const tasksForToday: any[] = [];
  
  CATEGORIAS.forEach(cat => {
    const tareas = datos[cat.id]?.tareas || [];
    tareas.forEach((tarea: any) => {
      if (tarea.id === 1 && shouldShowTaskToday(tarea)) { // Solo tareas principales con programación
        tasksForToday.push({
          ...tarea,
          categoria: cat.label,
          categoriaId: cat.id,
          icon: cat.icon,
          color: cat.color,
        });
      }
    });
  });
  
  return tasksForToday;
};

export default function CartaFrutosPage() {
  const router = useRouter();
  const [datos, setDatos] = useState<any>({});
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(true);
  
  // NUEVO ESTADO: CONTROL DE EDICIÓN MANUAL
  const [isEditing, setIsEditing] = useState(false);
  
  // NUEVO ESTADO: ¿Está totalmente sellada por Staff?
  const [isLockedByStaff, setIsLockedByStaff] = useState(false);
  
  // NUEVOS ESTADOS PARA LA EVIDENCIA
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<any>(null); // Tarea seleccionada para completar
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 🚨 NUEVOS ESTADOS PARA EL PROMPT DE RECURRENCIA
  const [showRecurrencePrompt, setShowRecurrencePrompt] = useState(false);
  const [currentRecurrenceCatId, setCurrentRecurrenceCatId] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // 🔥 NUEVO ESTADO: Modal de advertencia para "X veces al día"
  const [showMultiplePerDayWarning, setShowMultiplePerDayWarning] = useState(false);
  const [multiplePerDayData, setMultiplePerDayData] = useState<{
    catId: string;
    goalText: string;
    timesPerDay: number;
  } | null>(null);

  // 🔥 EFECTO: Auto-seleccionar todos los días cuando es diario
  useEffect(() => {
    if (showRecurrencePrompt && currentRecurrenceCatId) {
      const tareaPrincipal = datos[currentRecurrenceCatId]?.tareas.find((t: any) => t.id === 1);
      const parsed = parseGoalForTasks(tareaPrincipal?.texto || '');
      
      if (parsed.isDaily && selectedDays.length === 0) {
        setSelectedDays(['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']);
      }
    }
  }, [showRecurrencePrompt, currentRecurrenceCatId, datos, selectedDays.length]);

  useEffect(() => {
    async function loadData() {
      try {
        console.log('📥 Cargando datos de Carta de Frutos desde BD...');
        const res = await fetch('/api/carta');
        const data = await res.json();
        console.log('📊 Datos recibidos:', data);
        console.log('📊 Estructura completa:', JSON.stringify(data, null, 2));
        
        // Log específico de cada campo
        if (data.id) {
          console.log('✅ ID encontrado:', data.id);
          console.log('💰 finanzasMeta:', data.finanzasMeta);
          console.log('❤️ relacionesMeta:', data.relacionesMeta);
          console.log('⭐ talentosMeta:', data.talentosMeta);
          console.log('⚡ pazMentalMeta:', data.pazMentalMeta);
          console.log('😄 ocioMeta:', data.ocioMeta);
          console.log('❤️‍🩹 saludMeta:', data.saludMeta);
          console.log('👥 servicioComunMeta:', data.servicioComunMeta);
        } else {
          console.warn('⚠️ No se encontró carta (data.id es null/undefined)');
        }

        // Función helper para agregar tareas desde la BD
        const agregarTareasDesdeDB = (tareasArray: any[], categoria: string, data: any) => {
          if (data.tareas && Array.isArray(data.tareas)) {
            const categoriaLower = categoria.toLowerCase().replace('_', '');
            const tareasCategoria = data.tareas.filter((t: any) => 
              t.categoria.toLowerCase() === categoriaLower
            );
            
            console.log(`   📂 ${categoria}: ${tareasCategoria.length} tarea(s) encontrada(s)`);
            
            tareasCategoria.forEach((t: any, index: number) => {
              const nuevaTarea = {
                id: tareasArray.length + 1,
                texto: t.descripcion,
                completado: t.completada,
                enRevision: false,
                requiereEvidencia: t.requiereFoto
              };
              
              console.log(`      ✓ Agregando: "${nuevaTarea.texto.substring(0, 50)}..."`);
              tareasArray.push(nuevaTarea);
            });
          }
          
          // Si solo hay la meta principal, agregar plantilla de acción
          if (tareasArray.length === 1) {
            console.log(`      ℹ️ Solo meta principal, agregando plantilla de acción`);
            tareasArray.push({ 
              id: 2, 
              texto: "Acción diaria comprometida.", 
              completado: false, 
              enRevision: false, 
              requiereEvidencia: false 
            });
          }
          return tareasArray;
        };

        // Si no hay datos, dejamos cargar vacío para que el usuario escriba manual
        if (data.id) {
          console.log('✅ Carta encontrada con ID:', data.id);
          
          // LEER EL ESTADO DE AUTORIZACIÓN
          const estadoCarta = data.estado || 'BORRADOR';
          if (estadoCarta === 'AUTORIZADA') {
            console.log('🔒 Carta está AUTORIZADA (bloqueada)');
            setIsLockedByStaff(true);
          }
          
          const datosReales: any = {};
          console.log('🔄 Procesando categorías...');
          
          CATEGORIAS.forEach(cat => {
            let metaTexto = '';
            let avanceValor = 0;
            let tareasArray: any[] = []; // Array para almacenar las tareas de la categoría
            
            // 🚨 LOGICA PRINCIPAL DE ENROLAMIENTO
            if (cat.id === 'ENROLAMIENTO') { 
                metaTexto = "Compromiso de enrolar 4 invitados.";
                avanceValor = data.enrolamientoAvance || 0;
                console.log(`   📌 ${cat.id}: Meta fija (Enrolamiento)`);
                
                // 🚨 TAREAS FIJAS DE ENROLAMIENTO (4 Invitados)
                tareasArray = [
                    { id: 10, texto: "Invitado 1", completado: false, enRevision: false, requiereEvidencia: true },
                    { id: 11, texto: "Invitado 2", completado: false, enRevision: false, requiereEvidencia: true },
                    { id: 12, texto: "Invitado 3", completado: false, enRevision: false, requiereEvidencia: true },
                    { id: 13, texto: "Invitado 4", completado: false, enRevision: false, requiereEvidencia: true },
                ];
                
            } else if (cat.id === 'FINANZAS') { 
                metaTexto = data.finanzasMeta || ""; 
                avanceValor = data.finanzasAvance || 0;
                console.log(`   💰 ${cat.id}: "${metaTexto.substring(0, 50)}..." (${avanceValor}%)`);
                
                const scheduledDays = data.finanzasScheduledDays ? JSON.parse(data.finanzasScheduledDays) : [];
                tareasArray = [
                    { 
                        id: 1, 
                        texto: metaTexto, 
                        completado: avanceValor === 100, 
                        enRevision: false, 
                        requiereEvidencia: true,
                        scheduledDays: scheduledDays,
                        lastCompletedDate: null,
                    }
                ];
                
                // Agregar tareas adicionales desde la BD
                if (data.tareas && Array.isArray(data.tareas)) {
                  const tareasFinanzas = data.tareas.filter((t: any) => 
                    t.categoria.toLowerCase() === 'finanzas'
                  );
                  
                  console.log(`      📋 ${tareasFinanzas.length} tarea(s) adicional(es) encontrada(s)`);
                  
                  tareasFinanzas.forEach((t: any, index: number) => {
                    tareasArray.push({
                      id: 2 + index,
                      texto: t.descripcion,
                      completado: t.completada,
                      enRevision: false,
                      requiereEvidencia: t.requiereFoto
                    });
                  });
                }
                
                // Si no hay tareas adicionales, agregar la plantilla
                if (tareasArray.length === 1) {
                  tareasArray.push({ id: 2, texto: "Acción diaria comprometida.", completado: false, enRevision: false, requiereEvidencia: false });
                }
            } else if (cat.id === 'RELACIONES') { 
                metaTexto = data.relacionesMeta || ""; 
                avanceValor = data.relacionesAvance || 0;
                console.log(`   ❤️ ${cat.id}: "${metaTexto.substring(0, 50)}..." (${avanceValor}%)`);
                
                const scheduledDays = data.relacionesScheduledDays ? JSON.parse(data.relacionesScheduledDays) : [];
                tareasArray = [
                    { id: 1, texto: metaTexto, completado: avanceValor === 100, enRevision: false, requiereEvidencia: true, scheduledDays: scheduledDays, lastCompletedDate: null }
                ];
                tareasArray = agregarTareasDesdeDB(tareasArray, 'relaciones', data);
            } else if (cat.id === 'TALENTOS') { 
                metaTexto = data.talentosMeta || ""; 
                avanceValor = data.talentosAvance || 0;
                console.log(`   ⭐ ${cat.id}: "${metaTexto.substring(0, 50)}..." (${avanceValor}%)`);
                
                const scheduledDays = data.talentosScheduledDays ? JSON.parse(data.talentosScheduledDays) : [];
                tareasArray = [
                    { id: 1, texto: metaTexto, completado: avanceValor === 100, enRevision: false, requiereEvidencia: true, scheduledDays: scheduledDays, lastCompletedDate: null }
                ];
                tareasArray = agregarTareasDesdeDB(tareasArray, 'talentos', data);
            } else if (cat.id === 'PAZ_MENTAL') { 
                metaTexto = data.pazMentalMeta || ""; 
                avanceValor = data.pazMentalAvance || 0;
                console.log(`   ⚡ ${cat.id}: "${metaTexto.substring(0, 50)}..." (${avanceValor}%)`);
                
                const scheduledDays = data.pazMentalScheduledDays ? JSON.parse(data.pazMentalScheduledDays) : [];
                tareasArray = [
                    { id: 1, texto: metaTexto, completado: avanceValor === 100, enRevision: false, requiereEvidencia: true, scheduledDays: scheduledDays, lastCompletedDate: null }
                ];
                tareasArray = agregarTareasDesdeDB(tareasArray, 'pazmental', data);
            } else if (cat.id === 'OCIO') { 
                metaTexto = data.ocioMeta || ""; 
                avanceValor = data.ocioAvance || 0;
                console.log(`   😄 ${cat.id}: "${metaTexto.substring(0, 50)}..." (${avanceValor}%)`);
                
                const scheduledDays = data.ocioScheduledDays ? JSON.parse(data.ocioScheduledDays) : [];
                tareasArray = [
                    { id: 1, texto: metaTexto, completado: avanceValor === 100, enRevision: false, requiereEvidencia: true, scheduledDays: scheduledDays, lastCompletedDate: null }
                ];
                tareasArray = agregarTareasDesdeDB(tareasArray, 'ocio', data);
            } else if (cat.id === 'SALUD') { 
                metaTexto = data.saludMeta || ""; 
                avanceValor = data.saludAvance || 0;
                console.log(`   ❤️‍🩹 ${cat.id}: "${metaTexto.substring(0, 50)}..." (${avanceValor}%)`);
                
                const scheduledDays = data.saludScheduledDays ? JSON.parse(data.saludScheduledDays) : [];
                tareasArray = [
                    { id: 1, texto: metaTexto, completado: avanceValor === 100, enRevision: false, requiereEvidencia: true, scheduledDays: scheduledDays, lastCompletedDate: null }
                ];
                tareasArray = agregarTareasDesdeDB(tareasArray, 'salud', data);
            } else if (cat.id === 'COMUNIDAD') { 
                metaTexto = data.servicioComunMeta || ""; 
                avanceValor = data.servicioComunAvance || 0;
                console.log(`   👥 ${cat.id}: "${metaTexto.substring(0, 50)}..." (${avanceValor}%)`);
                
                const scheduledDays = data.servicioComunScheduledDays ? JSON.parse(data.servicioComunScheduledDays) : [];
                tareasArray = [
                    { id: 1, texto: metaTexto || "", completado: avanceValor === 100, enRevision: false, requiereEvidencia: true, scheduledDays: scheduledDays, lastCompletedDate: null }
                ];
                tareasArray = agregarTareasDesdeDB(tareasArray, 'comunidad', data);
            }

            datosReales[cat.id] = {
              avance: avanceValor, 
              tareas: tareasArray
            };
          });
          
          console.log('✅ Datos cargados y mapeados correctamente');
          console.log('📊 Estado final:', datosReales);
          setDatos(datosReales);
        } else {
            console.log('ℹ️ No hay carta guardada, iniciando con datos vacíos');
            // Inicializar vacío para edición manual
            const datosVacios: any = {};
            CATEGORIAS.forEach(cat => {
                if (cat.id === 'ENROLAMIENTO') {
                    // Enrolamiento siempre tiene sus 4 tareas fijas
                    datosVacios[cat.id] = { 
                        avance: 0, 
                        tareas: [
                            { id: 10, texto: "Invitado 1", completado: false, enRevision: false, requiereEvidencia: true },
                            { id: 11, texto: "Invitado 2", completado: false, enRevision: false, requiereEvidencia: true },
                            { id: 12, texto: "Invitado 3", completado: false, enRevision: false, requiereEvidencia: true },
                            { id: 13, texto: "Invitado 4", completado: false, enRevision: false, requiereEvidencia: true },
                        ]
                    };
                } else {
                    datosVacios[cat.id] = { 
                        avance: 0, 
                        tareas: [{ 
                            id: 1, 
                            texto: "", 
                            completado: false, 
                            enRevision: false,
                            scheduledDays: [],
                            lastCompletedDate: null
                        }] 
                    };
                }
            });
            setDatos(datosVacios);
            setIsEditing(true); // Si es nuevo, activar edición auto
        }
      } catch (e) { 
        console.error('❌ Error al cargar datos:', e); 
      } finally { 
        setLoading(false); 
      }
    }
    loadData();
  }, [router]);

  // FUNCIÓN UNIVERSAL para editar cualquier tarea (Principal o Secundaria)
  const handleEditTaskText = (catId: string, taskId: number, newText: string) => {
    setDatos((prevDatos: any) => ({
      ...prevDatos,
      [catId]: {
        ...prevDatos[catId],
        tareas: prevDatos[catId].tareas.map((tarea: any) =>
          tarea.id === taskId ? { ...tarea, texto: newText } : tarea
        ),
      },
    }));
  };

  // MANTENER COMPATIBILIDAD: handleTextChange ahora llama a handleEditTaskText para ID 1
  const handleTextChange = (catId: string, text: string) => {
    handleEditTaskText(catId, 1, text);
  };

  // AGREGAR NUEVA TAREA/ACCIÓN (MODO EDICIÓN)
  const handleAddTask = (catId: string) => {
    setDatos((prevDatos: any) => {
      const currentTasks = prevDatos[catId]?.tareas || [];
      
      // Aseguramos un ID único (buscamos el ID más alto y sumamos 1)
      const newId = currentTasks.length > 0 
          ? Math.max(...currentTasks.map((t: any) => t.id)) + 1 
          : 3; // Empezamos en 3 porque 1 es la Meta Principal y 2 es el Check Diario

      const newTask = {
        id: newId,
        texto: `Acción específica #${newId - 1}`, // Mensaje por defecto
        completado: false,
        enRevision: false,
        isSecondary: true, // Bandera para indicar que no es la meta principal (ID 1)
      };

      return {
        ...prevDatos,
        [catId]: {
          ...prevDatos[catId],
          tareas: [...currentTasks, newTask],
        },
      };
    });
  };

  // 🚨 FUNCIÓN LLAMADA POR EL MODAL DE DÍAS
  const handleSetScheduledDays = (catId: string, days: string[], taskId?: number) => {
    setDatos((prevDatos: any) => ({
      ...prevDatos,
      [catId]: {
        ...prevDatos[catId],
        tareas: prevDatos[catId].tareas.map((tarea: any) =>
          // Actualizamos la tarea con el ID correcto (por defecto la principal)
          tarea.id === (taskId || 1) ? { 
              ...tarea, 
              scheduledDays: days,
              // 🚨 Inicializamos la fecha de última completación al guardar la Carta
              lastCompletedDate: null 
          } : tarea
        ),
      },
    }));
    // Cerramos el modal y limpiamos el estado
    setShowRecurrencePrompt(false);
    setCurrentRecurrenceCatId(null);
  };

  // 🚨 Función para manejar la selección de días en el modal
  const handleDayToggle = (dayId: string) => {
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId) 
        : [...prev, dayId]
    );
  };

  // 🚨 Función que llama a handleSetScheduledDays cuando se guarda el modal
  const handleRecurrenceSave = () => {
    if (!currentRecurrenceCatId) return;
    
    // Obtener el ID de la tarea que estamos editando (guardado en window)
    const taskId = (window as any).__editingTaskId || 1;
    
    // Llama a la función que guarda los días en la tarea correcta
    handleSetScheduledDays(currentRecurrenceCatId, selectedDays, taskId);
    
    // Limpiar el ID temporal
    delete (window as any).__editingTaskId;

    // Limpia selección actual
    setSelectedDays([]);
    setShowRecurrencePrompt(false);
    
    // 🔥 NUEVO: Buscar la siguiente tarea (de cualquier categoría) que necesita días
    let foundCurrent = false;
    let nextTaskNeedingDays: { catId: string, taskId: number } | null = null;
    
    for (const cat of CATEGORIAS) {
      if (cat.id === 'ENROLAMIENTO') continue;
      
      const todasLasTareas = datos[cat.id]?.tareas || [];
      
      for (const tarea of todasLasTareas) {
        // Si ya pasamos la tarea actual, buscar la siguiente que necesite días
        if (foundCurrent) {
          if (!tarea.texto || tarea.texto.trim().length === 0) continue;
          
          const parsed = parseGoalForTasks(tarea.texto);
          
          if (parsed.isQuantifiableAndRecurrent && 
              (!tarea.scheduledDays || tarea.scheduledDays.length === 0)) {
            nextTaskNeedingDays = { catId: cat.id, taskId: tarea.id };
            break;
          }
        }
        
        // Marcar cuando encontramos la tarea actual
        if (cat.id === currentRecurrenceCatId && tarea.id === taskId) {
          foundCurrent = true;
        }
      }
      
      if (nextTaskNeedingDays) break; // Ya encontramos la siguiente
    }
    
    if (nextTaskNeedingDays) {
      // 🔥 HAY MÁS TAREAS: Abrir modal para la siguiente
      console.log('🔄 Abriendo modal para siguiente tarea:', nextTaskNeedingDays);
      
      // Verificar si tiene múltiples veces al día
      const nextTarea = datos[nextTaskNeedingDays.catId]?.tareas.find((t: any) => t.id === nextTaskNeedingDays.taskId);
      const nextParsed = parseGoalForTasks(nextTarea?.texto || '');
      
      if (nextParsed.isMultiplePerDay && nextParsed.timesPerDay && nextParsed.timesPerDay > 1) {
        // Mostrar advertencia primero
        setMultiplePerDayData({
          catId: nextTaskNeedingDays.catId,
          goalText: nextTarea.texto,
          timesPerDay: nextParsed.timesPerDay
        });
        setShowMultiplePerDayWarning(true);
      } else {
        // Abrir modal de días directamente
        setCurrentRecurrenceCatId(nextTaskNeedingDays.catId);
        (window as any).__editingTaskId = nextTaskNeedingDays.taskId; // Guardar el taskId
        setSelectedDays([]);
        setTimeout(() => setShowRecurrencePrompt(true), 300); // Pequeño delay para animación
      }
      
      // Toast de progreso
      setToastMessage({
        title: '✅ Días Guardados',
        description: 'Ahora programa la siguiente tarea...'
      });
    } else {
      // 🔥 NO HAY MÁS: Todas las tareas están completas
      setToastMessage({
        title: '🎉 ¡Todas las Tareas Programadas!',
        description: 'Ahora puedes guardar tu carta completa.'
      });
    }
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };


  const toggleTask = (catId: string, taskId: number) => {
    // Si la carta está en modo edición manual (isEditing), permitimos el check normal.
    // Si no está editando, obligamos la subida de evidencia.
    if (!isEditing) {
        const tarea = datos[catId]?.tareas.find((t: any) => t.id === taskId);
        if (tarea && !tarea.completado) {
            setTaskToComplete({ catId, taskId, texto: tarea.texto });
            setShowEvidenceModal(true);
            return;
        }
    }
    
    // Lógica antigua para cheques secundarios o si ya estaba completada y se quiere revertir
    setDatos((prev: any) => {
      const nuevasTareas = prev[catId].tareas.map((t: any) => 
        t.id === taskId ? { ...t, completado: !t.completado } : t
      );
      const total = nuevasTareas.length;
      const completadas = nuevasTareas.filter((t: any) => t.completado).length;
      return {
        ...prev,
        [catId]: { tareas: nuevasTareas, avance: Math.round((completadas / total) * 100) }
      };
    });
  };

  // SUBIDA DE EVIDENCIA
  const handleEvidenceUpload = async () => {
    if (!currentFile || !taskToComplete) {
      alert("Debes seleccionar una foto para la evidencia.");
      return;
    }
    
    setSaving(true);
    
    try {
      // LLAMADA A LA API DE BACKEND
      const res = await fetch('/api/evidencia/completar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            taskId: taskToComplete.taskId.toString(), 
            categoria: taskToComplete.catId 
        }),
      });

      if (!res.ok) {
        let errorMessage = "Fallo desconocido al subir la evidencia.";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
          console.error('Error del backend:', errorData); // Debug
        } catch {
          // Si no se puede parsear el JSON, usar mensaje por defecto
          console.error('No se pudo parsear la respuesta del servidor');
        }
        console.error('Status de respuesta:', res.status, 'Mensaje:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // 2. Si es exitoso, marcamos como "en revisión" (no completado aún)
      setDatos((prev: any) => {
        const tareasActualizadas = prev[taskToComplete.catId].tareas.map((t: any) => 
            t.id === taskToComplete.taskId ? { ...t, enRevision: true, completado: false } : t
        );
        // Recalculamos el avance aquí
        const total = tareasActualizadas.length;
        const completadas = tareasActualizadas.filter((t: any) => t.completado).length;
        
        return {
            ...prev,
            [taskToComplete.catId]: { 
                ...prev[taskToComplete.catId],
                tareas: tareasActualizadas, 
                avance: Math.round((completadas / total) * 100) 
            }
        };
      });
      
      setShowEvidenceModal(false);
      setCurrentFile(null);
      setTaskToComplete(null);
      setShowToast(true); // Mostrar el toast de éxito
      setTimeout(() => setShowToast(false), 3000);
      
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Error al subir la evidencia. Intenta de nuevo."); // Usamos el estado
      // Limpiamos los modales de evidencia para mostrar el de error
      setShowEvidenceModal(false);
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // FUNCIÓN CLAVE: VALIDA LAS REGLAS DE COMPROMISO CUÁNTICO
  const isCommitmentValid = () => {
    let isValid = true;
    let missingAreas: string[] = [];

    CATEGORIAS.forEach(cat => {
      // Si es Enrolamiento, pasamos
      if (cat.id === 'ENROLAMIENTO') { return; }
      
      const tareas = datos[cat.id]?.tareas || [];
      const tareaPrincipal = tareas.find((t: any) => t.id === 1);
      const tareaPrincipalTexto = tareaPrincipal?.texto;

      // 1. Candado de Longitud
      if (!tareaPrincipalTexto || tareaPrincipalTexto.trim().length < 5) { 
        isValid = false;
        missingAreas.push(`${cat.label} (Falta Descripción Mínima)`);
        return; 
      }
      
      // 2. Candado de Cuantificación
      const parsed = parseGoalForTasks(tareaPrincipalTexto);
      
      // 🚨 BLOQUEO: No permitir metas anuales
      if (parsed.isAnnual) {
        isValid = false;
        missingAreas.push(`${cat.label} (Frecuencia Anual NO Permitida - El programa dura ~3 meses)`);
        return;
      }
      
      if (!parsed.isQuantifiableAndRecurrent) {
        isValid = false;
        missingAreas.push(`${cat.label} (NO es Medible/Cuantificable)`);
        return;
      }

      // 🚨 3. CANDADO DE DIAS DE RECURRENCIA PARA TAREA PRINCIPAL
      if (parsed.isQuantifiableAndRecurrent && (!tareaPrincipal.scheduledDays || tareaPrincipal.scheduledDays.length === 0)) {
        isValid = false;
        missingAreas.push(`${cat.label} - Meta Principal (Requiere Programar Días de la Semana)`);
        return;
      }
      
      // 🚨 4. NUEVO: VALIDAR TAREAS SECUNDARIAS CUANTIFICABLES
      const tareasSecundarias = tareas.filter((t: any) => t.id !== 1);
      tareasSecundarias.forEach((tarea: any) => {
        if (!tarea.texto || tarea.texto.trim().length === 0) return; // Ignorar vacías
        
        const parsedSecondary = parseGoalForTasks(tarea.texto);
        
        if (parsedSecondary.isQuantifiableAndRecurrent && 
            (!tarea.scheduledDays || tarea.scheduledDays.length === 0)) {
          isValid = false;
          missingAreas.push(`${cat.label} - Tarea #${tarea.id} (Requiere Programar Días de la Semana)`);
        }
      });
    });

    if (missingAreas.length > 0) {
      // Mensaje especial si hay metas anuales
      const hasAnnualIssue = missingAreas.some(area => area.includes('Anual NO Permitida'));
      const baseMessage = hasAnnualIssue 
        ? '🚨 METAS ANUALES NO PERMITIDAS: El programa F.R.U.T.O.S. dura aproximadamente 3 meses. Declara metas alcanzables en ese periodo (diarias, semanales o mensuales). '
        : '🚨 CANDADO DE COMPROMISO: Cada meta debe ser medible, cuantificable y tener días programados (ej: "Ir al gimnasio 4 veces a la semana" → Lunes, Miércoles, Viernes). ';
      
      return { 
        valid: false, 
        message: `${baseMessage}Revisa las áreas: ${missingAreas.join(', ')}.` 
      };
    }

    return { valid: true, message: "Compromiso listo para ser sellado por el Staff." };
  };

  // GUARDAR DATOS (A LA BD)
  const handleSave = async () => {
    const validation = isCommitmentValid();
    
    if (!validation.valid) {
        // 🚨 LÓGICA DE DETECCIÓN DE DIAS FALTANTES
        const missingRecurrence = validation.message.includes('(Requiere Programar Días de la Semana)');
        
        if (missingRecurrence) {
            // 🔥 NUEVO: Buscar la PRIMERA tarea (de cualquier categoría) que necesita días programados
            let firstTaskNeedingDays: { catId: string, taskId: number } | null = null;
            let taskWithMultiplePerDay = null;
            
            outerLoop:
            for (const cat of CATEGORIAS) {
                if (cat.id === 'ENROLAMIENTO') continue;
                
                const todasLasTareas = datos[cat.id]?.tareas || [];
                
                for (const tarea of todasLasTareas) {
                    if (!tarea.texto || tarea.texto.trim().length === 0) continue;
                    
                    const parsed = parseGoalForTasks(tarea.texto);
                    
                    // Si es cuantificable Y no tiene días programados
                    if (parsed.isQuantifiableAndRecurrent && 
                        (!tarea.scheduledDays || tarea.scheduledDays.length === 0)) {
                        firstTaskNeedingDays = { catId: cat.id, taskId: tarea.id };
                        
                        // 🔥 DETECTAR "X veces al día" ANTES de abrir modal de días
                        if (parsed.isMultiplePerDay && parsed.timesPerDay && parsed.timesPerDay > 1) {
                            taskWithMultiplePerDay = {
                                catId: cat.id,
                                goalText: tarea.texto,
                                timesPerDay: parsed.timesPerDay
                            };
                        }
                        
                        break outerLoop; // Encontramos la primera, salir completamente
                    }
                }
            }
            
            console.log('🔍 Primera tarea que necesita días:', firstTaskNeedingDays);
            console.log('⚠️ Múltiples veces al día detectado:', taskWithMultiplePerDay);
            
            if (taskWithMultiplePerDay) {
                // 🔥 MOSTRAR MODAL DE ADVERTENCIA PRIMERO
                setMultiplePerDayData(taskWithMultiplePerDay);
                setShowMultiplePerDayWarning(true);
                setErrorMessage('');
                return;
            }
            
            if (firstTaskNeedingDays) {
                // Pre-cargar los días actuales si existen
                const tarea = datos[firstTaskNeedingDays.catId]?.tareas.find((t: any) => t.id === firstTaskNeedingDays.taskId);
                if (tarea?.scheduledDays) {
                    setSelectedDays(tarea.scheduledDays);
                } else {
                    setSelectedDays([]); // Limpiar selección anterior
                }
                setCurrentRecurrenceCatId(firstTaskNeedingDays.catId);
                (window as any).__editingTaskId = firstTaskNeedingDays.taskId; // Guardar el taskId
                setShowRecurrencePrompt(true);
                setErrorMessage('');
                console.log('✅ Abriendo modal para:', firstTaskNeedingDays);
                return;
            }
        }
        
        // Si no es un error de días, mostrar el mensaje de error y bloquear
        setErrorMessage(validation.message);
        return; 
    }

    setSaving(true);
    
    // 🚨 NUEVO PASO: Aplicar la regla de recurrencia a las tareas al guardar
    const payload: any = {};
    CATEGORIAS.forEach(cat => {
        const tareaPrincipal = datos[cat.id]?.tareas.find((t: any) => t.id === 1);
        
        if (tareaPrincipal) {
            const parsed = parseGoalForTasks(tareaPrincipal.texto);
            
            payload[cat.id] = {
                meta: tareaPrincipal.texto,
                avance: datos[cat.id]?.avance || 0,
                recurrence: parsed.recurrenceRule, // Será 'DAILY_CHECK_IN' o null
                scheduledDays: tareaPrincipal.scheduledDays || [] // 🔥 Agregar scheduledDays al payload
            };
        } else {
            payload[cat.id] = {
                meta: "",
                avance: 0,
                recurrence: null,
                scheduledDays: []
            };
        }
    });

    try {
        await fetch('/api/carta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        setToastMessage({
          title: '¡Progreso Guardado!',
          description: 'Declaración actualizada en el Quantum.'
        });
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        setIsEditing(false); // Bloquear después de guardar
    } catch (e) {
        alert("Error al guardar");
    } finally {
        setSaving(false);
    }
  };

  const totalPoints = Object.values(datos).reduce((a: any, b: any) => a + (b.avance || 0), 0) as number;
  const averageLevel = Math.round(totalPoints / 8) || 0;

  // Llamar a la validación para usar en el render
  const validation = isCommitmentValid();

  if (loading) return <div className="p-20 text-center text-cyan-400"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 relative">
      
      {/* TOAST */}
      {showToast && (
        <div className="fixed top-24 right-4 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className="bg-slate-900 border border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.3)] text-white px-6 py-4 rounded-2xl flex items-center gap-4">
            <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
              <CheckCircle2 size={24} className="text-slate-900" />
            </div>
            <div>
              <h4 className="font-bold text-sm">{toastMessage.title}</h4>
              <p className="text-xs text-slate-400">{toastMessage.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SUBIDA DE EVIDENCIA (NUEVO) */}
      {showEvidenceModal && taskToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg bg-slate-900 border border-purple-500/50 rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.2)] overflow-hidden">
            <button onClick={() => setShowEvidenceModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
            <div className="p-8">
                <div className="flex items-center gap-4 border-b border-white/10 pb-4 mb-6">
                    <div className="h-10 w-10 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/50">
                        <Sparkles size={20} className="text-purple-400" />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase italic">Sellar con Evidencia</h3>
                </div>
                
                <p className="text-slate-400 text-sm mb-4">
                    Para completar: <span className="font-bold text-cyan-400">{taskToComplete.texto}</span>
                </p>

                <div className="border-2 border-dashed border-white/20 p-6 rounded-xl flex flex-col items-center justify-center bg-slate-950">
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => setCurrentFile(e.target.files ? e.target.files[0] : null)}
                        className="hidden"
                        id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg transition-all shadow-lg shadow-purple-600/30">
                        {currentFile ? currentFile.name : "Seleccionar Foto (JPEG/PNG)"}
                    </label>
                    {currentFile && <p className="text-xs text-green-400 mt-2">¡Archivo listo para subir!</p>}
                </div>

                <div className="mt-8">
                    <button 
                        onClick={handleEvidenceUpload}
                        disabled={saving || !currentFile}
                        className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                        {saving ? 'PROCESANDO EVIDENCIA...' : 'COMPLETAR Y SUBIR EVIDENCIA'}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 🔥 MODAL DE ADVERTENCIA: MÚLTIPLES VECES AL DÍA --- */}
      {showMultiplePerDayWarning && multiplePerDayData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-yellow-500/30">
            <div className="p-6">
              {/* Icono de advertencia */}
              <div className="flex justify-center mb-4">
                <div className="bg-yellow-500/20 p-4 rounded-full">
                  <svg className="w-12 h-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              {/* Título */}
              <h3 className="text-2xl font-bold text-center text-yellow-400 mb-3">
                ⚠️ Múltiples Evidencias Diarias
              </h3>

              {/* Descripción del problema */}
              <div className="bg-slate-700/50 rounded-lg p-4 mb-4 border border-yellow-500/20">
                <p className="text-slate-300 text-sm mb-2">
                  Tu meta declarada:
                </p>
                <p className="text-white font-semibold italic mb-3">
                  &ldquo;{multiplePerDayData.goalText}&rdquo;
                </p>
                <p className="text-yellow-300 font-bold text-center text-lg">
                  Requerirá subir {multiplePerDayData.timesPerDay} evidencias fotográficas diferentes cada día.
                </p>
              </div>

              {/* Explicación */}
              <div className="bg-red-900/20 rounded-lg p-4 mb-6 border border-red-500/30">
                <p className="text-slate-300 text-sm leading-relaxed">
                  Esto significa que <span className="text-red-400 font-semibold">cada vez</span> que declares hacer esta actividad, el sistema te pedirá una foto de evidencia. 
                  Esto puede ser <span className="text-yellow-400 font-semibold">difícil de mantener</span> a largo plazo.
                </p>
              </div>

              {/* Recomendación */}
              <div className="bg-cyan-900/20 rounded-lg p-4 mb-6 border border-cyan-500/30">
                <p className="text-cyan-400 font-semibold text-sm mb-2">💡 Recomendación:</p>
                <p className="text-slate-300 text-sm">
                  Simplifica tu meta a <span className="text-cyan-300 font-semibold">&ldquo;1 vez al día&rdquo;</span> o <span className="text-cyan-300 font-semibold">&ldquo;diariamente&rdquo;</span>. 
                  Así solo tendrás que subir 1 evidencia por día.
                </p>
              </div>

              {/* Botones de acción */}
              <div className="space-y-3">
                {/* Opción 1: Simplificar (recomendado) */}
                <button
                  onClick={() => {
                    // Simplificar: reescribir la meta automáticamente
                    const { catId, goalText } = multiplePerDayData;
                    
                    // Reemplazar "X veces al día" → "1 vez al día" o "diariamente"
                    let simplifiedText = goalText
                      .replace(/\d+\s*(veces|vez)\s*(al dia|al día|por dia|por día|diarias|diarios)/gi, 'diariamente')
                      .replace(/\s{2,}/g, ' ')
                      .trim();
                    
                    // Actualizar el texto de la meta
                    setDatos((prev: any) => ({
                      ...prev,
                      [catId]: {
                        ...prev[catId],
                        tareas: prev[catId].tareas.map((t: any) => 
                          t.id === 1 ? { ...t, texto: simplifiedText } : t
                        )
                      }
                    }));
                    
                    // Toast de confirmación
                    setToastMessage({
                      title: '✅ Meta Simplificada',
                      description: 'Tu meta fue actualizada a "diariamente". Ahora selecciona los días.'
                    });
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 3000);
                    
                    // Cerrar este modal y abrir el de selección de días
                    setShowMultiplePerDayWarning(false);
                    setMultiplePerDayData(null);
                    
                    // Abrir modal de días con auto-selección diaria
                    setCurrentRecurrenceCatId(catId);
                    setSelectedDays([]); // Será auto-completado por isDaily
                    setShowRecurrencePrompt(true);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl font-bold shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={20} />
                  SIMPLIFICAR A 1 TAREA DIARIA (Recomendado)
                </button>

                {/* Opción 2: Continuar con múltiples evidencias */}
                <button
                  onClick={() => {
                    const { catId } = multiplePerDayData;
                    
                    // Toast de advertencia
                    setToastMessage({
                      title: '⚠️ Múltiples Evidencias Diarias',
                      description: `Recuerda: necesitarás subir ${multiplePerDayData.timesPerDay} fotos cada día.`
                    });
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 4000);
                    
                    // Cerrar advertencia y abrir selección de días
                    setShowMultiplePerDayWarning(false);
                    setMultiplePerDayData(null);
                    
                    setCurrentRecurrenceCatId(catId);
                    setSelectedDays([]);
                    setShowRecurrencePrompt(true);
                  }}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-semibold transition-all"
                >
                  Continuar con {multiplePerDayData.timesPerDay} Evidencias Diarias
                </button>

                {/* Opción 3: Cancelar y editar manualmente */}
                <button
                  onClick={() => {
                    setShowMultiplePerDayWarning(false);
                    setMultiplePerDayData(null);
                  }}
                  className="w-full py-3 bg-transparent hover:bg-slate-800 text-slate-400 rounded-xl font-medium transition-all border border-slate-600"
                >
                  Cancelar y Editar Manualmente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE SELECCIÓN DE DÍAS DE RECURRENCIA (NUEVO) --- */}
      {(() => {
        if (!showRecurrencePrompt || !currentRecurrenceCatId) return null;
        
        const tareaPrincipal = datos[currentRecurrenceCatId]?.tareas.find((t: any) => t.id === 1);
        const parsed = parseGoalForTasks(tareaPrincipal?.texto || '');
        const { requiredCount, isMonthly, isWeekly, isDaily } = parsed;
        
        // Validación: ¿Se seleccionaron suficientes días?
        const hasEnoughDays = requiredCount ? selectedDays.length >= requiredCount : selectedDays.length > 0;
        
        console.log('🔍 Estado del modal:', { 
          showRecurrencePrompt, 
          currentRecurrenceCatId,
          requiredCount,
          selectedCount: selectedDays.length,
          isMonthly,
          isWeekly
        });
        
        return (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                console.log('Click en el fondo del modal');
              }
            }}
          >
            <div className="relative w-full max-w-md bg-slate-900 border-2 border-purple-500 rounded-3xl p-8 shadow-[0_0_50px_rgba(168,85,247,0.5)] max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-black text-white border-b border-white/10 pb-3 mb-4">
                {isMonthly ? '📅 Selecciona la Fecha Mensual' : isDaily ? '✅ Tarea Diaria Configurada' : '📅 Programar Recurrencia Semanal'}
              </h3>
              
              {/* MOSTRAR LA META */}
              <div className="mb-6 bg-slate-800/50 border border-purple-500/30 rounded-xl p-4">
                <p className="text-xs text-purple-400 font-bold uppercase mb-2">
                  {CATEGORIAS.find(c => c.id === currentRecurrenceCatId)?.label}
                </p>
                <p className="text-white font-semibold text-base leading-relaxed italic">
                  "{tareaPrincipal?.texto}"
                </p>
              </div>
              
              <p className="text-slate-300 mb-4 text-base">
                {isDaily ? (
                  <span className="block text-sm text-green-400 font-bold">
                    ✅ Se ha configurado automáticamente para todos los días de la semana
                  </span>
                ) : requiredCount && (
                  <span className="block text-sm text-purple-400 font-bold">
                    Debes seleccionar exactamente {requiredCount} {requiredCount === 1 ? 'día' : 'días'}
                  </span>
                )}
              </p>
            
            {isMonthly ? (
              // CALENDARIO MENSUAL (Para "X veces al mes")
              <div className="mb-6">
                <p className="text-sm text-slate-400 mb-3">
                  Selecciona {requiredCount ? `los ${requiredCount} días` : 'el día'} del mes:
                </p>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                    const dayId = `dia-${day}`;
                    const isSelected = selectedDays.includes(dayId);
                    
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          if (isSelected) {
                            // Deseleccionar
                            setSelectedDays(selectedDays.filter(d => d !== dayId));
                          } else {
                            // Seleccionar (permitir múltiples)
                            setSelectedDays([...selectedDays, dayId]);
                          }
                        }}
                        className={`py-2 px-1 rounded-lg font-bold transition-all border text-xs
                          ${isSelected
                            ? 'bg-purple-600 text-white border-purple-400 shadow-lg' 
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                          }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              // DÍAS DE LA SEMANA (Para frecuencias semanales)
              <div className="grid grid-cols-2 gap-3 mb-6">
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day.id}
                    onClick={() => !isDaily && handleDayToggle(day.id)}
                    disabled={isDaily}
                    className={`py-3 px-4 rounded-xl font-bold transition-all border text-sm
                      ${selectedDays.includes(day.id) 
                        ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/30' 
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                      }
                      ${isDaily ? 'cursor-not-allowed opacity-100' : ''}
                      `}
                  >
                    {day.label} {isDaily && '✓'}
                  </button>
                ))}
              </div>
            )}
            
            {/* Mensaje de validación */}
            {requiredCount && selectedDays.length > 0 && !hasEnoughDays && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                <p className="text-xs text-red-400">
                  ⚠️ Faltan {requiredCount - selectedDays.length} {requiredCount - selectedDays.length === 1 ? 'día' : 'días'} por seleccionar
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRecurrencePrompt(false);
                  setSelectedDays([]);
                }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleRecurrenceSave}
                disabled={!hasEnoughDays}
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/30"
              >
                Guardar {isMonthly ? 'Fecha' : 'Días'}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* HUD SUPERIOR */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl animate-pulse-slow"></div>
        <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="relative h-24 w-24 flex items-center justify-center flex-shrink-0">
               <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                 <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                 <path className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-all duration-1000 ease-out" strokeDasharray={`${averageLevel}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
               </svg>
               <div className="absolute flex flex-col items-center">
                 <span className="text-2xl font-black text-white">{averageLevel}%</span>
                 <span className="text-[10px] font-bold text-cyan-500 uppercase">AVG</span>
               </div>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white italic tracking-tighter">
                TU CARTA <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">LEGENDARIA</span>
              </h1>
              <p className="text-slate-400 font-medium text-sm sm:text-base">
                {isEditing ? "MODO EDICIÓN ACTIVADO. Define tus metas manualmente." : "Tus metas están selladas. Enfócate en la ejecución."}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            {/* BOTÓN MENTOR */}
            <Link href="/dashboard/mentor-ia" className="flex-1 xl:flex-none">
                <button className="w-full h-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-4 rounded-2xl border border-white/5 transition-all hover:scale-105 group">
                    <Bot className="text-purple-400 group-hover:text-purple-300" size={20} />
                    <span className="uppercase text-xs sm:text-sm tracking-wide">MENTOR IA</span>
                </button>
            </Link>

            {/* BOTÓN GUARDAR */}
            <button 
                onClick={handleSave}
                disabled={saving}
                className="flex-1 xl:flex-none flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black px-8 py-4 rounded-2xl transition-all hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] active:scale-95 disabled:opacity-50"
            >
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                {saving ? 'GUARDANDO...' : (isEditing ? 'GUARDAR CAMBIOS' : 'GUARDAR AVANCE')}
            </button>
          </div>
        </div>
      </div>

      {/* HEADER DE CONTROL (EDICIÓN MANUAL) */}
      <div className={`
        border rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-all
        ${isLockedByStaff 
          ? 'bg-yellow-900/20 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.1)]'
          : isEditing 
          ? 'bg-cyan-900/20 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
          : 'bg-slate-900 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]'}
      `}>
        <div className="flex items-center gap-4">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center border flex-shrink-0 ${
            isLockedByStaff 
              ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400'
              : isEditing 
              ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' 
              : 'bg-red-500/10 border-red-500/50 text-red-500'
          }`}>
            {isLockedByStaff ? <CheckCircle2 size={18} /> : (isEditing ? <Unlock size={18} /> : <Lock size={18} />)}
          </div>
          <div>
            <h2 className="text-white font-bold uppercase tracking-wider text-xs sm:text-sm">
                {isLockedByStaff 
                    ? "CARTA OFICIALMENTE AUTORIZADA" 
                    : (isEditing ? "Edición Manual Habilitada" : "Protocolo de Entrenamiento Activo")}
            </h2>
            <p className="text-slate-400 text-[10px] sm:text-xs">
                {isLockedByStaff 
                    ? "Tu carta ha sido validada por Mentor y Coordinador. Ya no se permiten cambios." 
                    : (isEditing 
                      ? "Define tus metas bajo el protocolo SMART." 
                      : "Las metas están selladas por tu declaración.")}
            </p>
          </div>
        </div>
        
        {/* TOOLTIP S.M.A.R.T. */}
        {isEditing && (
            <div className="relative group flex items-center">
                <span className="text-xs font-bold text-cyan-400 underline cursor-pointer">
                    ¿Qué es S.M.A.R.T.?
                </span>
                
                {/* Contenedor del Tooltip (Oculto por defecto) */}
                <div className="absolute left-1/2 bottom-full mb-2 w-72 p-4 
                                bg-slate-800 border border-cyan-500/50 rounded-lg shadow-2xl 
                                opacity-0 group-hover:opacity-100 transition-opacity duration-300 
                                pointer-events-none transform -translate-x-1/2 z-50">
                    <h4 className="font-extrabold text-cyan-400 mb-1">METAS S.M.A.R.T.</h4>
                    <ul className="text-xs text-slate-300 space-y-1">
                        <li><strong className="text-white">S</strong>pecífic (Específico): ¿Qué voy a hacer exactamente?</li>
                        <li><strong className="text-white">M</strong>easurable (Medible): ¿Cuánto o cuántas veces? (Número)</li>
                        <li><strong className="text-white">A</strong>chievable (Alcanzable): ¿Es realista para mí?</li>
                        <li><strong className="text-white">R</strong>elevant (Relevante): ¿Por qué es importante para mi visión?</li>
                        <li><strong className="text-white">T</strong>ime-bound (Tiempo): ¿Para cuándo lo haré? (Fecha Límite)</li>
                    </ul>
                    {/* Flecha del Tooltip */}
                    <div className="absolute w-3 h-3 bg-slate-800 border-r border-b border-cyan-500/50 transform rotate-45 -bottom-1.5 left-1/2 -translate-x-1/2"></div>
                </div>
            </div>
        )}
        
        {/* BOTÓN GUARDAR Y BLOQUEAR */}
        {!isLockedByStaff ? (
            <button 
              onClick={() => {
                  if (isEditing) {
                      // 🔥 SIEMPRE llama a handleSave - la función manejará la validación internamente
                      handleSave();
                  } else {
                      setIsEditing(true);
                  }
              }}
              // 🔥 NUEVO: El botón siempre está habilitado en modo edición para poder abrir el modal
              disabled={false}
              className={`
                flex items-center gap-2 py-3 px-6 rounded-lg text-sm font-bold w-full md:w-auto transition-all
                ${isEditing ? 'bg-cyan-500 hover:bg-cyan-600 text-slate-900' : 'bg-green-500 hover:bg-green-600 text-slate-900'}
              `}
            >
              {isEditing ? <> <Save size={14} /> GUARDAR Y DECLARAR </> : <> <Pencil size={14} /> EDITAR CALENDARIO </>}
            </button>
        ) : (
            // Si está bloqueada, mostramos el candado dorado
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg text-xs font-bold">
                <Lock size={14} /> VALIDADA
            </div>
        )}
      </div>

      {/* --- MENSAJE DE VALIDACIÓN (POSICIONADO AQUÍ) --- */}
      {isEditing && !validation.valid && (
          <div className="p-4 bg-red-800 border border-red-500 rounded-xl text-sm text-white shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
              <XCircle size={20} className='flex-shrink-0' />
              <span className="font-medium">{validation.message}</span>
          </div>
      )}

      {/* GRID DE METAS */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIAS.map((cat) => {
          const info = datos[cat.id] || { avance: 0, tareas: [] };
          const tareas = info.tareas || [];
          const valorActual = info.avance || 0;
          const metaTexto = tareas[0]?.texto || "";

          return (
            <div key={cat.id} className="flex flex-col h-full rounded-3xl bg-slate-900 border-2 border-slate-800">
              <div className={`relative p-4 flex items-center justify-between ${cat.bgColor}`}>
                 <div className="absolute inset-0 bg-slate-900 opacity-90"></div>
                 <div className="relative z-10 flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/10 shadow-sm ${cat.color}`}>
                      <cat.icon size={20} />
                    </div>
                    <h3 className="font-black text-white uppercase tracking-wide">{cat.label}</h3>
                 </div>
                 <div className="relative z-10 text-2xl font-black text-white">{valorActual}%</div>
              </div>
              
              <div className="flex-1 p-4 space-y-2">
                
                {/* Mapeo de todas las tareas (principal + secundarias) */}
                {tareas.map((tarea: any) => {
                    const isEnrolamiento = cat.id === 'ENROLAMIENTO';

                    return (
                        <div 
                            key={tarea.id} 
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all 
                                ${isEnrolamiento ? 'bg-indigo-900/30 border-indigo-500/50' : 
                                isEditing ? 'bg-cyan-950/30 border-cyan-500/30 ring-1 ring-cyan-500/20' : 'bg-slate-950/30 border-white/5'}
                                ${tarea.id === 1 && isEditing && !isEnrolamiento ? 'border-2 border-yellow-500/50' : ''}`}
                        >
                            {/* Checkbox: Habilitado para toggleTask (subir evidencia) pero no muestra edición en texto */}
                            <button 
                                onClick={() => !isEditing && toggleTask(cat.id, tarea.id)}
                                className={`mt-0.5 flex-shrink-0 transition-colors ${
                                    tarea.enRevision ? 'text-yellow-500' : 
                                    (tarea.completado ? 'text-green-400' : 'text-slate-600 hover:text-slate-400')
                                }`}
                                disabled={isEditing || isLockedByStaff || tarea.enRevision || tarea.completado}
                            >
                                {tarea.enRevision ? 
                                    <Clock size={20} className="animate-spin" /> : 
                                    (tarea.completado ? <CheckSquare size={20} /> : <Square size={20} />)
                                }
                            </button>
                            
                            {isEditing && !isEnrolamiento ? (
                                <div className="w-full space-y-2">
                                    <textarea 
                                        value={tarea.texto}
                                        onChange={(e) => handleEditTaskText(cat.id, tarea.id, e.target.value)} 
                                        className="w-full bg-slate-900/50 text-white text-sm outline-none resize-none h-12 placeholder-slate-600 rounded-lg p-2 border border-white/10"
                                        placeholder={tarea.id === 1 ? 'META PRINCIPAL (Medible)' : 'Acción Secundaria'}
                                    />
                                    
                                    {/* Botón para editar/agregar días programados (tareas cuantificables) */}
                                    {(() => {
                                        const parsed = parseGoalForTasks(tarea.texto || '');
                                        if (!parsed.isQuantifiableAndRecurrent) return null;
                                        
                                        const hasDays = tarea.scheduledDays && tarea.scheduledDays.length > 0;
                                        
                                        return (
                                            <button
                                                onClick={() => {
                                                    setCurrentRecurrenceCatId(cat.id);
                                                    setSelectedDays(tarea.scheduledDays || []);
                                                    setShowRecurrencePrompt(true);
                                                    // Guardar el ID de la tarea que estamos editando
                                                    (window as any).__editingTaskId = tarea.id;
                                                }}
                                                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                                    hasDays 
                                                        ? 'bg-purple-900/30 border border-purple-500/50 text-purple-300 hover:bg-purple-900/50'
                                                        : 'bg-yellow-900/30 border border-yellow-500/50 text-yellow-300 hover:bg-yellow-900/50 animate-pulse'
                                                }`}
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {hasDays 
                                                    ? `Editar Días: ${tarea.scheduledDays.map((d: string) => 
                                                        d.startsWith('dia-') ? d.replace('dia-', '') : d.charAt(0).toUpperCase()
                                                    ).join(', ')}`
                                                    : '⚠️ Programar Días (Requerido)'
                                                }
                                            </button>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="w-full space-y-1">
                                    <span className={`text-sm font-medium leading-tight block ${tarea.completado ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                        {isEnrolamiento ? (
                                            <span className="font-medium text-white flex items-center gap-1">
                                                {tarea.texto}
                                            </span>
                                        ) : (
                                            tarea.texto || <span className="text-slate-600 italic">Sin acción definida</span>
                                        )}
                                    </span>
                                    
                                    {/* Mostrar días programados con botón de edición (modo lectura) */}
                                    {!isEnrolamiento && tarea.scheduledDays && tarea.scheduledDays.length > 0 && (
                                        <button
                                            onClick={() => {
                                                // Activar modo edición primero
                                                setIsEditing(true);
                                                // Pequeño delay para que se renderice el botón de edición
                                                setTimeout(() => {
                                                    setCurrentRecurrenceCatId(cat.id);
                                                    setSelectedDays(tarea.scheduledDays || []);
                                                    setShowRecurrencePrompt(true);
                                                    (window as any).__editingTaskId = tarea.id;
                                                }, 100);
                                            }}
                                            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors group"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="font-semibold">
                                                {tarea.scheduledDays.map((d: string) => 
                                                    d.startsWith('dia-') ? `Día ${d.replace('dia-', '')}` : d.charAt(0).toUpperCase() + d.slice(1, 3)
                                                ).join(', ')}
                                            </span>
                                            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            )}
                            
                            {/* Candado de Edición */}
                            {!isEditing && <Lock size={12} className="text-slate-700 ml-auto flex-shrink-0 mt-1" />}
                        </div>
                    );
                })}

                {/* Botón de Agregar Tarea: Deshabilitado en Enrolamiento */}
                {isEditing && cat.id !== 'ENROLAMIENTO' && (
                    <button 
                        onClick={() => handleAddTask(cat.id)}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-cyan-400 bg-cyan-900/10 border border-cyan-500/30 rounded-xl hover:bg-cyan-900/30 transition-colors"
                    >
                        + Agregar Tarea/Acción
                    </button>
                )}

              </div>
              <div className="px-4 pb-4">
                 <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${cat.bgColor} transition-all duration-500`} style={{ width: `${valorActual}%` }}></div>
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- MODAL DE ERROR (Diseño Consistente) --- */}
      {errorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm bg-slate-900 border border-red-500/50 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden p-6 text-center">
             <XCircle size={40} className="text-red-500 mx-auto mb-4" />
             <h3 className="font-bold text-white text-xl">ERROR DE EVIDENCIA</h3>
             <p className="text-sm text-slate-400 mt-2">{errorMessage}</p>
             <button 
                onClick={() => setErrorMessage(null)} 
                className="mt-6 w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
             >
                Aceptar
             </button>
          </div>
        </div>
      )}
    </div>
  );
}