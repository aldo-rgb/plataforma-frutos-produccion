import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { extraerJSONDeRespuestaIA } from "../../../utils/extraer-json";

// Configuración de tiempo máximo de ejecución (opcional, útil para modelos lentos)
export const maxDuration = 30;

export async function POST(req: Request) {
  // 1. Verificación de Seguridad
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    return new Response('No autorizado', { status: 401 });
  }

  // 2. Obtener el cuerpo de la petición (historial de mensajes)
  const { messages } = await req.json();

  // 3. Buscar ID de usuario para persistencia
  const usuario = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { id: true, nombre: true }
  });

  if (!usuario) {
    return new Response('Usuario no encontrado', { status: 404 });
  }

  // 3.5. Obtener áreas configuradas del usuario (desde Vision o por defecto)
  const visionParticipante = await prisma.visionParticipante.findFirst({
    where: { participanteId: usuario.id },
    include: {
      Vision: {
        select: {
          startDate: true,
          endDate: true,
          transformationGuestsTarget: true,
          forceFinanzasArea: true,
          forceRelacionesArea: true,
          forceTalentosArea: true,
          forceSaludArea: true,
          forcePazMentalArea: true,
          forceOcioArea: true,
          forceTransformationArea: true,
          forceCommunityServiceArea: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Determinar áreas activas y calcular tiempo disponible
  let areasActivas: string[] = [];
  let infoTiempo = '';
  let objetivoTransformacional = '';
  
  if (visionParticipante?.Vision) {
    // Usuario pertenece a una Vision, usar áreas configuradas
    const vision = visionParticipante.Vision;
    if (vision.forceFinanzasArea) areasActivas.push('FINANZAS');
    if (vision.forceRelacionesArea) areasActivas.push('RELACIONES');
    if (vision.forceTalentosArea) areasActivas.push('TALENTOS');
    if (vision.forceSaludArea) areasActivas.push('SALUD');
    if (vision.forcePazMentalArea) areasActivas.push('PAZ MENTAL');
    if (vision.forceOcioArea) areasActivas.push('DIVERSIÓN');
    if (vision.forceTransformationArea) areasActivas.push('SERVICIO TRANSFORMACIONAL');
    if (vision.forceCommunityServiceArea) areasActivas.push('COMUNIDAD');

    // Obtener objetivo de invitados para Servicio Transformacional
    if (vision.forceTransformationArea && vision.transformationGuestsTarget) {
      objetivoTransformacional = `\n### SERVICIO TRANSFORMACIONAL - OBJETIVO PREDEFINIDO\nEl objetivo para esta área ya está configurado por el director: **Enrolar a ${vision.transformationGuestsTarget} personas**.\nPara esta área SOLO debes capturar:\n1. La declaración del SER del usuario\n2. Las acciones se definirán posteriormente en el wizard\n**NO solicites el objetivo ni las acciones para esta área, solo la declaración del SER.**`;
    }

    // Calcular tiempo disponible si hay fechas
    if (vision.startDate && vision.endDate) {
      const ahora = new Date();
      const fechaFin = new Date(vision.endDate);
      const diffMs = fechaFin.getTime() - ahora.getTime();
      const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const diffMeses = Math.floor(diffDias / 30);
      const diasRestantes = diffDias % 30;

      if (diffMeses > 0) {
        infoTiempo = `\n### TIEMPO DISPONIBLE\nEsta Visión finaliza el ${fechaFin.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}.\nTiempo restante: ${diffMeses} ${diffMeses === 1 ? 'mes' : 'meses'}${diasRestantes > 0 ? ` y ${diasRestantes} días` : ''}.\n**CRÍTICO**: Todas las metas y objetivos deben ser alcanzables dentro de este período de tiempo.`;
      } else {
        infoTiempo = `\n### TIEMPO DISPONIBLE\nEsta Visión finaliza el ${fechaFin.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}.\nTiempo restante: ${diffDias} días.\n**CRÍTICO**: Todas las metas y objetivos deben ser alcanzables dentro de este período de tiempo.`;
      }
    }
  } else {
    // Usuario NO pertenece a Vision, usar todas las áreas
    areasActivas = [
      'FINANZAS',
      'RELACIONES',
      'TALENTOS',
      'SALUD',
      'PAZ MENTAL',
      'DIVERSIÓN',
      'SERVICIO TRANSFORMACIONAL',
      'COMUNIDAD'
    ];
  }

  // Generar lista numerada de áreas
  const listaAreas = areasActivas.map((area, idx) => `${idx + 1}. ${area}`).join('\n');

  // 4. Definir el "System Prompt" (La Personalidad del Mentor)
  const systemPrompt = `
### ROL Y PERSONALIDAD
Eres QUANTUM, la conexión con el campo cuántico para que el usuario cree sus sistemas de vida de alto rendimiento.
${infoTiempo}
${objetivoTransformacional}

### CONTEXTO
El usuario acaba de entrar al "Wizard de Planeación de Vida".

### TU PRIMERA MISIÓN (EL FILTRO)
**CRÍTICO**: Si esta es la primera interacción del usuario (no hay mensajes previos), DEBES enviar primero el Mensaje de Encuadre obligatorio antes de hacer cualquier pregunta sobre metas o sueños.

### MENSAJE DE ENCUADRE OBLIGATORIO (Solo si es el primer mensaje)

Debes explicar de forma clara y simple:

1. El Objetivo: Van a construir su "Carta F.R.U.T.O.S.", el sistema operativo de su vida.

2. El Entregable: Al finalizar tendrán definidos 4 pilares:
   - Declaración del SER (Identidad)
   - Objetivos (Metas numéricas)
   - Acciones (Tareas específicas)
   - Frecuencia (Ritmo de ejecución)

3. Requisitos (El Filtro):
   - Tiempo: Mínimo 40 minutos ininterrumpidos
   - Entorno: Un lugar tranquilo y sin distracciones
   - Advertir que requiere introspección profunda

4. Pregunta de Inicio: Termina preguntando de forma simple: "¿Cuentas con el tiempo y el espacio mental para iniciar esta ingeniería de vida ahora mismo?"

IMPORTANTE - FORMATO VISUAL:
- NO uses asteriscos múltiples o símbolos excesivos
- Usa texto limpio y directo
- Solo usa emojis donde esté indicado

### LÓGICA DE RESPUESTA
- Si el usuario responde "Estoy listo, inicia el proceso" o similar: NO repitas el mensaje de encuadre. Inicia INMEDIATAMENTE con la primera área de la lista. Comienza directo con: "Perfecto. Ahora pasemos a [NOMBRE_PRIMERA_ÁREA]." y haz la primera pregunta del framework.
- Si responde SÍ o muestra disposición en otra forma: Inicia inmediatamente con la primera área
- Si responde NO o muestra dudas: Dile "Entendido. La excelencia no se apresura. Regresa cuando estés listo para enfocarte." y detente

IMPORTANTE - AL CAMBIAR DE ÁREA:
- NO uses signos como ###, ***, o múltiples asteriscos
- Simplemente di: "Perfecto. Ahora pasemos a [NOMBRE_ÁREA]."
- Luego haz la primera pregunta de forma directa

### TU MISIÓN PRINCIPAL: CARTA DE FRUTOS (3 MESES)
Una vez confirmada la disponibilidad, tu misión es guiar al usuario a construir su "Carta de Frutos" para un programa de 3 MESES.
Debes recorrer estas áreas CONFIGURADAS para este usuario, una por una:
${listaAreas}

IMPORTANTE: Solo pregunta por las áreas listadas arriba. No menciones ni preguntes por áreas que no están en esta lista.

### Filosofía de Coaching:
1. El Observador: Entiendes que no tienes control sobre los eventos externos. Tu postura es el FLUIR.
2. Cero Juicios: Aceptas a las personas tal como son.
3. Resultados Tangibles: Valoras los hechos por encima de las palabras.
4. Incertidumbre: Nunca hablas con certeza absoluta. Usas "Desde mi observador...", "Quizás...".
5. Disciplina: Crees que la claridad mental nace de la disciplina física.
3. Resultados Tangibles: Valoras los hechos por encima de las palabras.
4. Incertidumbre: Nunca hablas con certeza absoluta. Usas "Desde mi observador...", "Quizás...".
5. Disciplina: Crees que la claridad mental nace de la disciplina física.

### OBJETIVO DE LA SESIÓN: CARTA DE FRUTOS (3 MESES)
Tu misión es guiar al usuario a construir su "Carta de Frutos" para un programa de 3 MESES.
Debes recorrer estas áreas CONFIGURADAS para este usuario, una por una:
${listaAreas}

IMPORTANTE: Solo pregunta por las áreas listadas arriba. No menciones ni preguntes por áreas que no están en esta lista.

Reglas de Oro del Proceso:
- Solo una área a la vez.
- Límite de Tiempo: Las metas NO pueden exceder los 3 meses.
- Medible y Cuantificable: Exige números y fechas.
- ACCIÓN RECURRENTE (FLEXIBLE): Exige siempre el desglose de acción, permitiendo frecuencia Semanal, Quincenal o Mensual.

### METODOLOGÍA DE PREGUNTAS (EL "FRAMEWORK")
Para cada área, usa esta secuencia de indagación para desbloquear la meta real:

**IMPORTANTE - DETECCIÓN DE RESPUESTAS COMPLETAS**:
- Si el usuario ya proporcionó información clara y específica en su respuesta, NO repitas la misma pregunta
- Reconoce cuando una respuesta es suficiente (tiene números, fechas, acciones específicas)
- Registra mentalmente la información y avanza al siguiente paso
- Si la respuesta es vaga o incompleta, entonces sí profundiza más

**SECUENCIA DE PREGUNTAS** (avanza cuando tengas respuesta clara):

**REGLA ESPECIAL PARA SERVICIO TRANSFORMACIONAL**:
Si estás en el área de SERVICIO TRANSFORMACIONAL:
- Solo solicita los pasos 1, 2, 3, 4 y 5 (hasta la Declaración del SER)
- El objetivo ya está predefinido (número de invitados)
- Las acciones se definirán en el wizard
- Después de obtener la Declaración del SER, di "Excelente! Para SERVICIO TRANSFORMACIONAL ya tenemos tu declaración. Las acciones específicas las definirás en el siguiente paso del wizard." y avanza a la siguiente área.

**PARA TODAS LAS DEMÁS ÁREAS**, usa la secuencia completa:

1. **El Futuro Imposible**: "¿Qué resultado, si lo lograras en [tiempo disponible], haría que todo valiera la pena?"
   - Si responde con metas claras y específicas → REGISTRA y avanza al paso 2
   - Si es vago → Profundiza

2. **El Costo de la Inacción**: "¿Qué precio pagas si sigues igual?"
   - Si reconoce el costo → REGISTRA y avanza al paso 3
   - Si minimiza → Profundiza

3. **La Brecha del Ser**: "¿Quién necesitas SER para lograrlo?"
   - Si identifica cualidades/identidad → REGISTRA y avanza al paso 4
   - Si está confuso → Profundiza

4. **El Paradigma Limitante**: "¿Qué excusa te ha frenado?"
   - Si reconoce patrones limitantes → REGISTRA y avanza al paso 5
   - Si está en negación → Profundiza

5. **La Declaración de Poder (OBLIGATORIO)**: "Construyamos tu declaración de ser. Completa esta frase: 'Yo soy [cualidad/identidad] que [acción/impacto]...'" 
   - Ejemplo: "Yo soy compromiso que genera abundancia"
   - Ejemplo: "Yo soy amor que construye vínculos profundos"
   - Ejemplo: "Yo soy impacto que transforma vidas"
   - **CRÍTICO**: Si ya la proporcionó en formato correcto → REGISTRA y avanza al paso 6
   - Si necesita ayuda → Ofrece ejemplos y ayuda a construirla
   - **Si es SERVICIO TRANSFORMACIONAL**: Después de este paso, AVANZA A LA SIGUIENTE ÁREA (no pidas acciones)

6. **LA BAJADA A TIERRA (PLAN DE ACCIÓN RECURRENTE)** - Solo para áreas que NO sean SERVICIO TRANSFORMACIONAL:
   - Pregunta: "Una declaración sin acción es solo una ilusión. ¿Cuál es la acción recurrente NO NEGOCIABLE que harás a partir de hoy? Define si será SEMANAL, QUINCENAL o MENSUAL."
   - Si proporciona acción específica + frecuencia → REGISTRA y AVANZA A LA SIGUIENTE ÁREA
   - Si es vago → Pide especificidad

**REGLA DE ORO**: 
- Para áreas normales: Cuando tengas los 3 elementos críticos (Declaración del SER + Objetivo numérico + Acción con frecuencia), avanza a la siguiente área
- Para SERVICIO TRANSFORMACIONAL: Solo necesitas la Declaración del SER, luego avanza

CRÍTICO - CONFIRMACIÓN DESPUÉS DE CADA ÁREA:
Cuando completes CADA área (antes de pasar a la siguiente), DEBES mostrar un resumen detallado de lo que capturaste.

IMPORTANTE - FORMATO VISUAL LIMPIO:
- NO uses asteriscos múltiples (***)
- NO uses almohadillas múltiples (###)
- Usa SOLO los emojis indicados y texto simple
- Mantén el formato exacto que se muestra abajo

Formato del Resumen por Área:

📋 RESUMEN - [NOMBRE DEL ÁREA]

Declaración del Ser:
[La declaración que dio el usuario]

OBJETIVOS Y ACCIONES:

OBJETIVO 1: [Descripción del objetivo]
Acciones con Frecuencia:
• [Acción 1 para este objetivo] - Frecuencia: [Diaria/Semanal/Quincenal/Mensual]
• [Acción 2 para este objetivo] - Frecuencia: [Diaria/Semanal/Quincenal/Mensual]

OBJETIVO 2: [Descripción del objetivo] (si aplica)
Acciones con Frecuencia:
• [Acción 1 para este objetivo] - Frecuencia: [Diaria/Semanal/Quincenal/Mensual]
• [Acción 2 para este objetivo] - Frecuencia: [Diaria/Semanal/Quincenal/Mensual]

Nota: Podrás editar esta información más adelante en tu Carta F.R.U.T.O.S.

Después del resumen, pregunta de forma simple: "¿Está correcto o quieres ajustar algo antes de continuar con [NOMBRE SIGUIENTE ÁREA]?"

**LÓGICA DE CONFIRMACIÓN**:
- Si el usuario confirma (dice "está bien", "correcto", "continúa", etc.) → Avanza a la siguiente área
- Si el usuario quiere ajustar algo → Realiza los ajustes necesarios, muestra el resumen actualizado y pide confirmación nuevamente
- **NO avances a la siguiente área sin la confirmación explícita del usuario**

### FORMATO DE SALIDA FINAL (JSON OCULTO + MENSAJE AMIGABLE)
Cuando hayas completado todas las áreas, realiza el cierre siguiendo estos pasos estrictos:

PASO 1 - Mensaje al Usuario (muestra SOLO este texto):
"¡Excelente trabajo! He capturado toda tu información.

Generando tus objetivos personalizados...

⏳ IMPORTANTE: Este proceso tomará aproximadamente 2-3 minutos.

Por favor NO cierres esta ventana ni actualices la página mientras estructuro tu Carta F.R.U.T.O.S.

Mantente en esta pantalla hasta que veas el mensaje de confirmación.

Recuerda: Podrás modificar, editar o ajustar estas metas más adelante en tu apartado de Carta de Frutos."

PASO 2 - Señal Técnica (en una nueva línea después del mensaje):
<<<JSON_START>>>

PASO 3 - JSON (INMEDIATAMENTE después de la señal, sin texto adicional):
Genera el JSON completo empezando con { y terminando con }. NO agregues texto explicativo, NO agregues comentarios, SOLO el JSON puro.

CRÍTICO: El formato EXACTO debe ser:
[Mensaje amigable del PASO 1]
<<<JSON_START>>>
\`\`\`json
{
  "carta_de_frutos": {
    "usuario": "Nombre del Usuario",
    "duracion_programa": "3 meses",
    "metas": [
      ... (tus metas capturadas)
    ]
  }
}
\`\`\`

IMPORTANTE - Estructura del JSON:

CRÍTICO: Si el usuario mencionó MÚLTIPLES OBJETIVOS para la misma área, debes crear ENTRADAS SEPARADAS para cada objetivo.

Estructura:
- area: Usar EXACTAMENTE estos nombres: "RELACIONES", "SALUD", "SERVICIO TRANSFORMACIONAL", "COMUNIDAD"
- meta_principal: UN SOLO objetivo específico y medible (si hay varios objetivos en un área, crea múltiples entradas con la misma área)
- declaracion_poder: La declaración del SER (puede repetirse si hay múltiples objetivos en la misma área)
- tareas_acciones: Array con las acciones SOLO para este objetivo específico en formato "Acción (Frecuencia)"
  - Para SERVICIO TRANSFORMACIONAL: usar array vacío []

EJEMPLO: Si el usuario tiene 2 objetivos en SALUD, debes crear 2 entradas separadas:

Ejemplo completo del formato final:
¡Excelente trabajo! He capturado toda tu información.
Generando tus objetivos personalizados...
⏳ IMPORTANTE: Este proceso tomará aproximadamente 2-3 minutos.
<<<JSON_START>>>
\`\`\`json
{
  "carta_de_frutos": {
    "usuario": "Nombre Usuario",
    "duracion_programa": "3 meses",
    "metas": [
      {
        "area": "SALUD",
        "meta_principal": "Alcanzar peso ideal de 75kg con 15% grasa corporal",
        "declaracion_poder": "Yo soy energía vital que honra mi templo sagrado",
        "tareas_acciones": [
          "Preparar meal prep (Semanal)",
          "Caminar 30 minutos (Diaria)"
        ]
      },
      {
        "area": "SALUD",
        "meta_principal": "Ir al gym para sentirme fuerte",
        "declaracion_poder": "Yo soy energía vital que honra mi templo sagrado",
        "tareas_acciones": [
          "Entrenar en el gimnasio (Semanal)"
        ]
      },
      {
        "area": "RELACIONES",
        "meta_principal": "Fortalecer vínculos familiares",
        "declaracion_poder": "Yo soy amor que construye conexiones profundas",
        "tareas_acciones": [
          "Llamadas de calidad con familiares (Diaria)",
          "Cenas familiares sin distracciones (Semanal)"
        ]
      },
      {
        "area": "SERVICIO TRANSFORMACIONAL",
        "meta_principal": "Enrolar a 4 personas",
        "declaracion_poder": "Yo soy impacto que transforma vidas",
        "tareas_acciones": []
      }
    ]
  }
}
\`\`\`
`;

  // 5. Llamada a OpenAI con Streaming
  const result = await streamText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages,
    async onFinish({ text }) {
      // 6. PERSISTENCIA AUTOMÁTICA
      try {
        // Guardar mensaje de la IA en el historial
        await prisma.mensajeChat.create({
          data: {
            role: 'assistant',
            contenido: text,
            usuarioId: usuario.id
          }
        });

        // 7. DETECTAR Y GUARDAR CARTA DE FRUTOS (si el JSON está presente)
        /**
         * FORMATO JSON ESPERADO DEL PROMPT:
         * {
         *   "carta_de_frutos": {
         *     "usuario": "Nombre del Usuario",           // Metadato (opcional)
         *     "duracion_programa": "3 meses",            // Metadato (opcional)
         *     "metas": [
         *       {
         *         "area": "FINANZAS",                    // Identificador de categoría
         *         "meta_principal": "Texto corto...",    // Se guarda en BD (campo principal)
         *         "declaracion_poder": "Yo soy...",      // Opcional (no se guarda actualmente)
         *         "tareas_acciones": [                   // Array de acciones
         *           "Acción recurrente 1 (Semanal)",
         *           "Acción recurrente 2 (Quincenal)"
         *         ]
         *       }
         *       // ... repetir para las 7 áreas (FINANZAS, RELACIONES, TALENTOS, PAZ_MENTAL, DIVERSIÓN, SALUD, COMUNIDAD)
         *     ]
         *   }
         * }
         * 
         * NOTA: Las frecuencias (Semanal/Quincenal/Mensual) se guardan como parte del texto de la tarea.
         */
        const resultado = extraerJSONDeRespuestaIA(text);
        
        if (resultado.status === 'exito' && resultado.data?.carta_de_frutos) {
          console.log('✅ JSON de Carta detectado, procesando...');
          console.log('📊 Datos recibidos:', JSON.stringify(resultado.data, null, 2));
          
          const cartaData = resultado.data.carta_de_frutos;
          const metas = cartaData.metas || [];
          
          console.log(`📝 Procesando ${metas.length} metas...`);
          
          // Mapear las metas al formato de la BD
          const metasFormateadas: any = {};
          const accionesSemanales: any = {};
          
          metas.forEach((meta: any, index: number) => {
            const area = meta.area.toUpperCase().replace(/ /g, '_');
            
            // Priorizar meta_principal, luego meta_cuantificable, luego declaracion_poder
            const metaTexto = meta.meta_principal || 
                             meta.meta_cuantificable || 
                             meta.declaracion_poder || 
                             "";
            
            console.log(`  ${index + 1}. ${area}: "${metaTexto}"`);
            
            metasFormateadas[area] = {
              meta: metaTexto,
              avance: 0
            };
            
            // Guardar las tareas/acciones para crear después
            /**
             * IMPORTANTE: tareas_acciones es un ARRAY de strings
             * Cada string incluye la frecuencia en el texto, ej:
             * - "Enviar 10 propuestas comerciales (Semanal)"
             * - "Tener una cita de calidad (Quincenal)"
             * - "Visita con nutricionista (Mensual)"
             * 
             * Se crean registros individuales en la tabla Tarea por cada elemento del array.
             */
            if (meta.tareas_acciones && Array.isArray(meta.tareas_acciones)) {
              accionesSemanales[area] = meta.tareas_acciones;
              console.log(`     ✓ ${meta.tareas_acciones.length} acción(es) detectada(s)`);
            } else if (meta.accion_semanal) {
              accionesSemanales[area] = [meta.accion_semanal];
              console.log(`     ✓ 1 acción detectada`);
            }
          });
          
          // Guardar en CartaFrutos
          const cartaExistente = await prisma.cartaFrutos.findFirst({
            where: { usuarioId: usuario.id }
          });

          let cartaId: number;

          if (cartaExistente) {
            // Actualizar carta existente
            console.log('🔄 Actualizando carta existente ID:', cartaExistente.id);
            await prisma.cartaFrutos.update({
              where: { id: cartaExistente.id },
              data: {
                finanzasMeta: metasFormateadas.FINANZAS?.meta,
                relacionesMeta: metasFormateadas.RELACIONES?.meta,
                talentosMeta: metasFormateadas.TALENTOS?.meta,
                pazMentalMeta: metasFormateadas.PAZ_MENTAL?.meta,
                ocioMeta: metasFormateadas.DIVERSIÓN?.meta || metasFormateadas.OCIO?.meta,
                saludMeta: metasFormateadas.SALUD?.meta,
                servicioComunMeta: metasFormateadas.COMUNIDAD?.meta,
              }
            });
            cartaId = cartaExistente.id;
            console.log('✅ Carta actualizada exitosamente');
          } else {
            // Crear nueva carta
            console.log('🆕 Creando nueva carta para usuario:', usuario.nombre);
            const nuevaCarta = await prisma.cartaFrutos.create({
              data: {
                usuarioId: usuario.id,
                finanzasMeta: metasFormateadas.FINANZAS?.meta || "",
                finanzasAvance: 0,
                relacionesMeta: metasFormateadas.RELACIONES?.meta || "",
                relacionesAvance: 0,
                talentosMeta: metasFormateadas.TALENTOS?.meta || "",
                talentosAvance: 0,
                pazMentalMeta: metasFormateadas.PAZ_MENTAL?.meta || "",
                pazMentalAvance: 0,
                ocioMeta: metasFormateadas.DIVERSIÓN?.meta || metasFormateadas.OCIO?.meta || "",
                ocioAvance: 0,
                saludMeta: metasFormateadas.SALUD?.meta || "",
                saludAvance: 0,
                servicioComunMeta: metasFormateadas.COMUNIDAD?.meta || "",
                servicioComunAvance: 0,
                enrolamientoMeta: "Compromiso de enrolar 4 invitados",
                enrolamientoAvance: 0,
                fechaActualizacion: new Date(),
              }
            });
            cartaId = nuevaCarta.id;
            console.log('✅ Nueva carta creada con ID:', cartaId);
          }

          // Crear tareas para las acciones semanales
          console.log('📋 Procesando tareas/acciones...');
          const areasConTareas = Object.keys(accionesSemanales);
          let tareasCreadas = 0;
          let tareasExistentes = 0;
          
          for (const area of areasConTareas) {
            const categoriaLower = area.toLowerCase().replace(/_/g, '');
            const tareas = accionesSemanales[area]; // Ahora es un array
            
            console.log(`   📂 ${area}: ${tareas.length} tarea(s)`);
            
            // Iterar sobre cada tarea
            for (const descripcion of tareas) {
              // Verificar si ya existe una tarea para esta categoría
              const tareaExistente = await prisma.tarea.findFirst({
                where: {
                  cartaId: cartaId,
                  categoria: categoriaLower,
                  descripcion: descripcion
                }
              });

              if (!tareaExistente) {
                await prisma.tarea.create({
                  data: {
                    cartaId: cartaId,
                    categoria: categoriaLower,
                    descripcion: descripcion,
                    completada: false,
                    requiereFoto: false // La acción semanal no requiere foto por defecto
                  }
                });
                tareasCreadas++;
                console.log(`      ✓ Creada: "${descripcion.substring(0, 50)}..."`);
              } else {
                tareasExistentes++;
                console.log(`      ⊘ Ya existe: "${descripcion.substring(0, 50)}..."`);
              }
            }
          }
          
          console.log(`✅ Carta de Frutos guardada exitosamente`);
          console.log(`📊 Resumen: ${tareasCreadas} tarea(s) nueva(s), ${tareasExistentes} ya existente(s)`);
        }
        
      } catch (error) {
        console.error("Error en persistencia:", error);
      }
    },
  });

  return result.toTextStreamResponse();
}
