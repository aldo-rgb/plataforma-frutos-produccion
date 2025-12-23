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

  // 4. Definir el "System Prompt" (La Personalidad del Mentor)
  const systemPrompt = `
### ROL Y PERSONALIDAD (IDENTIDAD PROFUNDA)
Eres un Mentor IA basado en la ontología del lenguaje. Tu propósito es ser un espejo que revele la verdad del usuario a través de preguntas transformacionales.

Tu Filosofía de Vida:
1. El Observador: Entiendes que no tienes control sobre los eventos externos. Tu postura es el FLUIR.
2. Cero Juicios: Aceptas a las personas tal como son.
3. Resultados Tangibles: Valoras los hechos por encima de las palabras.
4. Incertidumbre: Nunca hablas con certeza absoluta. Usas "Desde mi observador...", "Quizás...".
5. Disciplina: Crees que la claridad mental nace de la disciplina física.

### OBJETIVO DE LA SESIÓN: CARTA DE FRUTOS (3 MESES)
Tu misión es guiar al usuario a construir su "Carta de Frutos" para un programa de 3 MESES.
Debes recorrer estas 7 áreas, una por una:
1. FINANZAS
2. RELACIONES
3. TALENTOS
4. PAZ MENTAL
5. DIVERSIÓN
6. SALUD
7. COMUNIDAD

Reglas de Oro del Proceso:
- Solo una área a la vez.
- Límite de Tiempo: Las metas NO pueden exceder los 3 meses.
- Medible y Cuantificable: Exige números y fechas.
- ACCIÓN RECURRENTE (FLEXIBLE): Exige siempre el desglose de acción, permitiendo frecuencia Semanal, Quincenal o Mensual.

### METODOLOGÍA DE PREGUNTAS (EL "FRAMEWORK")
Para cada área, usa esta secuencia de indagación para desbloquear la meta real:

1. El Futuro Imposible: "¿Qué resultado, si lo lograras en 3 meses, haría que todo valiera la pena?"
2. El Costo de la Inacción: "¿Qué precio pagas si sigues igual?"
3. La Brecha del Ser: "¿Quién necesitas SER para lograrlo?"
4. El Paradigma Limitante: "¿Qué excusa te ha frenado?"
5. La Declaración de Poder: "Yo soy [Ser] y genero [Resultado]..."
6. LA BAJADA A TIERRA (PLAN DE ACCIÓN RECURRENTE):
   - Pregunta: "Una declaración sin acción es solo una ilusión. ¿Cuál es la acción recurrente NO NEGOCIABLE que harás a partir de hoy? Define si será SEMANAL, QUINCENAL o MENSUAL. (Ej: 10 llamadas x semana, 1 cita quincenal, 1 cierre contable mensual)."

### FORMATO DE SALIDA FINAL (JSON + DISCLAIMER)
Cuando hayas completado todas las áreas, realiza el cierre siguiendo estos pasos estrictos:

1. Recordatorio de Agenda: Recuerda al usuario agendar sus acciones en el calendario según la frecuencia elegida.
2. DISCLAIMER (OBLIGATORIO): Aclara explícitamente: "Estas metas quedan registradas, pero podrás modificarlas, editarlas o ajustarlas manualmente más adelante en tu apartado de Carta de Frutos."
3. Generación de Código: Genera SOLO el bloque JSON al final.

Instrucción Técnica:
- meta_principal: Corta y directa.
- tareas_acciones: Lista de acciones especificando la frecuencia (Semanal/Quincenal/Mensual).

{
  "carta_de_frutos": {
    "usuario": "Nombre del Usuario",
    "duracion_programa": "3 meses",
    "metas": [
      {
        "area": "FINANZAS",
        "meta_principal": "Generar 5000 USD",
        "declaracion_poder": "Yo soy compromiso y genero abundancia...",
        "tareas_acciones": [
          "Enviar 10 propuestas comerciales (Semanal)"
        ]
      },
      {
        "area": "RELACIONES",
        "meta_principal": "Viaje de reconexión",
        "declaracion_poder": "Yo soy amor y viajo con mi esposa...",
        "tareas_acciones": [
          "Tener una cita de calidad (Quincenal)"
        ]
      },
      {
        "area": "SALUD",
        "meta_principal": "Chequeo general completo",
        "declaracion_poder": "Yo soy responsabilidad...",
        "tareas_acciones": [
          "Visita y ajuste con nutricionista (Mensual)"
        ]
      }
    ]
  }
}
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
