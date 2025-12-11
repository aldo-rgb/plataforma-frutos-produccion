/**
 * Utilidad para extraer y parsear JSON de respuestas de IA
 * que pueden contener texto adicional o estar envueltas en bloques de código
 */

interface ResultadoExtraccion {
  status: 'exito' | 'error' | 'esperando';
  mensaje: string;
  data?: any;
}

export function extraerJSONDeRespuestaIA(textoRespuestaAI: string): ResultadoExtraccion {
  /**
   * Toma la respuesta completa del chat, busca el bloque JSON,
   * lo extrae y lo convierte en un objeto manipulable para tu BD.
   */
  
  console.log('🔍 Buscando JSON en respuesta de IA...');
  
  // 1. Patrón Regex para encontrar contenido entre ```json y ```
  const patronCodeBlock = /```json\s*([\s\S]*?)```/i;
  
  // Buscamos el bloque de código (con saltos de línea incluidos)
  const match = textoRespuestaAI.match(patronCodeBlock);
  
  let jsonStr = "";
  
  if (match) {
    // Si encontró las etiquetas de código, extraemos el contenido interno
    jsonStr = match[1].trim();
    console.log('✓ JSON encontrado en bloque de código markdown');
  } else {
    // PLAN B: Intentar con ```javascript o solo ```
    const patronAlterno = /```(?:javascript|js)?\s*([\s\S]*?)```/i;
    const matchAlterno = textoRespuestaAI.match(patronAlterno);
    
    if (matchAlterno) {
      jsonStr = matchAlterno[1].trim();
      console.log('✓ JSON encontrado en bloque de código alternativo');
    } else {
      // PLAN C: Si la IA olvidó las etiquetas, buscamos el primer '{' y el último '}'
      try {
        const inicio = textoRespuestaAI.indexOf("{");
        const fin = textoRespuestaAI.lastIndexOf("}") + 1;
        
        if (inicio !== -1 && fin !== 0) {
          jsonStr = textoRespuestaAI.substring(inicio, fin);
          console.log('✓ JSON encontrado sin bloques de código');
        }
      } catch (error) {
        console.log('✗ No se encontró JSON en ningún formato');
        return {
          status: "error",
          mensaje: "No se encontró JSON en la respuesta"
        };
      }
    }
  }

  // 2. Convertir el texto a Objeto
  if (jsonStr) {
    try {
      // Limpiar el JSON antes de parsearlo
      const jsonLimpio = limpiarJSONSucio(jsonStr);
      const datosCarta = JSON.parse(jsonLimpio);
      
      console.log('✅ JSON parseado exitosamente');
      
      return {
        status: "exito",
        mensaje: "Metas extraídas correctamente",
        data: datosCarta
      };
    } catch (error) {
      console.error('✗ Error al parsear JSON:', error instanceof Error ? error.message : 'Error desconocido');
      console.error('📄 JSON que causó el error:', jsonStr.substring(0, 200) + '...');
      return {
        status: "error",
        mensaje: `El JSON generado no es válido: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  } else {
    console.log('⏳ Esperando JSON final...');
    return {
      status: "esperando",
      mensaje: "Aún no hay resumen final en formato JSON"
    };
  }
}

/**
 * Función auxiliar para limpiar JSON con comentarios o caracteres extraños
 */
export function limpiarJSONSucio(jsonStr: string): string {
  // Remover comentarios de una línea
  jsonStr = jsonStr.replace(/\/\/.*$/gm, '');
  
  // Remover comentarios multilinea
  jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remover espacios extra
  jsonStr = jsonStr.trim();
  
  return jsonStr;
}

/**
 * Función específica para validar estructura de Carta de Frutos
 */
export function validarEstructuraCartaFrutos(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  // Verificar si tiene la estructura esperada
  const tieneCartaDeFrutos = data.carta_de_frutos || data.cartaDeFrutos || data.metas;
  
  if (!tieneCartaDeFrutos) return false;
  
  // Validaciones adicionales según tu estructura
  return true;
}

// --- EJEMPLO DE USO ACTUALIZADO ---
/*
const respuestaFicticiaGPT = `
Ha sido un proceso revelador. Desde mi observador, veo que estás listo.
No olvides agendar tus compromisos según la frecuencia que definiste.

**DISCLAIMER:** Estas metas quedan registradas, pero podrás modificarlas, editarlas o 
ajustarlas manualmente más adelante en tu apartado de Carta de Frutos.

\`\`\`json
{
  "carta_de_frutos": {
    "usuario": "Juan Pérez",
    "duracion_programa": "3 meses",
    "metas": [
      {
        "area": "FINANZAS",
        "meta_principal": "Generar 5000 USD netos",
        "declaracion_poder": "Yo soy compromiso y genero abundancia",
        "tareas_acciones": [
          "Enviar 10 propuestas comerciales (Semanal)",
          "Reunión de cierre con equipo (Quincenal)"
        ]
      },
      {
        "area": "RELACIONES",
        "meta_principal": "Viaje de reconexión con mi pareja",
        "declaracion_poder": "Yo soy amor y viajo con mi esposa",
        "tareas_acciones": [
          "Tener una cita de calidad (Quincenal)"
        ]
      },
      {
        "area": "SALUD",
        "meta_principal": "Chequeo médico completo",
        "declaracion_poder": "Yo soy responsabilidad y cuido mi cuerpo",
        "tareas_acciones": [
          "Visita y ajuste con nutricionista (Mensual)"
        ]
      }
    ]
  }
}
\`\`\`

¿Algo más que necesites revisar?
`;

const resultado = extraerJSONDeRespuestaIA(respuestaFicticiaGPT);

if (resultado.status === 'exito') {
  console.log("✅ JSON extraído:", resultado.data);
  
  // FLUJO DE GUARDADO EN BD:
  // 1. Iterar sobre resultado.data.carta_de_frutos.metas
  // 2. Para cada meta: guardar en CartaFrutos el campo correspondiente
  // 3. Para cada tareas_acciones: crear registro en tabla Tarea
  // 4. Las frecuencias (Semanal/Quincenal/Mensual) se guardan como parte de la descripción
  
} else if (resultado.status === 'esperando') {
  console.log("⏳ Aún conversando, esperando JSON final...");
} else {
  console.error("❌ Error:", resultado.mensaje);
}
*/
