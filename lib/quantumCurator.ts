/**
 * QUANTUM CURATOR - El evaluador de calidad de The Quantum Archive
 * 
 * Su misión: Determinar si un Artefacto de Verdad merece estar
 * preservado en el Archivo Eterno con calidad excepcional.
 */

interface QualityEvaluation {
  isHighQuality: boolean;
  qualityScore: number; // 0-100
  rarityBonus: boolean; // Si merece subir de rareza
  feedback: string;
  reasoning: string;
}

/**
 * Evalúa la calidad de una evidencia usando IA
 * @param imageUrl - URL de la imagen en Cloudinary
 * @param descripcion - Descripción del usuario
 * @param tareaTexto - Texto de la tarea/acción
 * @param frecuencia - Frecuencia de la tarea (DAILY, WEEKLY, etc.)
 */
export async function evaluarCalidadEvidencia(
  imageUrl: string,
  descripcion: string | null,
  tareaTexto: string,
  frecuencia: string
): Promise<QualityEvaluation> {
  
  try {
    const systemPrompt = `Eres QUANTUM, el Curador del Archivo Eterno. Tu misión es evaluar la CALIDAD de Artefactos de Verdad (evidencias fotográficas de transformación personal).

## TU FILOSOFÍA
"Lo que no se captura con VERDAD, no merece ser preservado para la eternidad."

## CRITERIOS DE EVALUACIÓN (Score 0-100)

### ✨ CALIDAD EXCEPCIONAL (85-100) - HIGH QUALITY ✅
- Foto clara, bien iluminada, en foco
- Se ve claramente la acción siendo ejecutada
- Composición intencional (no accidental)
- Muestra ESFUERZO genuino
- Contexto relevante visible
- Ejemplo: Persona haciendo ejercicio con postura visible, libro abierto con página legible, comida saludable con presentación

### 🌟 CALIDAD ACEPTABLE (60-84) - STANDARD
- Foto reconocible pero básica
- Cumple el mínimo para verificar la acción
- Puede tener algunos defectos técnicos
- Ejemplo: Selfie borroso en el gym, foto rápida de un libro

### 📉 CALIDAD INSUFICIENTE (0-59) - LOW QUALITY ❌
- Foto muy borrosa, oscura o desenfocada
- No se puede verificar la acción
- Screenshot o contenido irrelevante
- Foto genérica sin contexto personal
- Ejemplo: Pantallazo de app, foto stock, imagen cortada

## BONUS DE RAREZA (+1 TIER)
Otorga bonus si:
1. Calidad excepcional (85+) Y
2. Muestra esfuerzo extraordinario:
   - Madrugada (5-7AM) con timestamp visible
   - Sesión de gym intensa con sudor/esfuerzo evidente
   - Logro complejo completado (proyecto terminado, meta alcanzada)
   - Momento "épico" capturado (amanecer post-ejercicio, etc)

## TU RESPUESTA DEBE SER JSON:
{
  "isHighQuality": true/false,
  "qualityScore": 0-100,
  "rarityBonus": true/false,
  "feedback": "Mensaje corto motivacional para el usuario",
  "reasoning": "Explicación técnica de tu evaluación"
}`;

    const userPrompt = `Evalúa este Artefacto de Verdad:

📸 **Descripción del usuario**: ${descripcion || 'Sin descripción'}
📋 **Tarea**: ${tareaTexto}
🔄 **Frecuencia**: ${frecuencia}
🖼️ **Imagen**: ${imageUrl}

Analiza la imagen en la URL y responde SOLO con el objeto JSON.`;

    // Llamar a OpenAI con visión
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3 // Evaluación más consistente
      })
    });

    if (!response.ok) {
      console.error('Error en llamada a OpenAI:', await response.text());
      // Fallback: si falla la IA, asumimos calidad estándar
      return {
        isHighQuality: false,
        qualityScore: 70,
        rarityBonus: false,
        feedback: 'Tu evidencia ha sido registrada en el Archivo.',
        reasoning: 'Evaluación automática no disponible - calidad asumida como estándar'
      };
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '{}';
    
    // Parsear respuesta JSON
    const evaluation: QualityEvaluation = JSON.parse(aiResponse);

    console.log('🤖 QUANTUM Curator evaluó:', {
      score: evaluation.qualityScore,
      highQuality: evaluation.isHighQuality,
      bonus: evaluation.rarityBonus,
      feedback: evaluation.feedback
    });

    return evaluation;

  } catch (error) {
    console.error('Error en evaluación de calidad:', error);
    
    // Fallback en caso de error
    return {
      isHighQuality: false,
      qualityScore: 70,
      rarityBonus: false,
      feedback: 'Tu evidencia ha sido registrada en el Archivo.',
      reasoning: 'Error en evaluación automática - calidad asumida como estándar'
    };
  }
}

/**
 * Determina la rareza final considerando el bonus de calidad
 */
export function aplicarBonusRareza(rarezaBase: string, bonus: boolean): string {
  if (!bonus) return rarezaBase;

  const jerarquia: Record<string, string> = {
    'COMMON': 'UNCOMMON',
    'UNCOMMON': 'RARE',
    'RARE': 'EPIC',
    'EPIC': 'LEGENDARY',
    'LEGENDARY': 'LEGENDARY' // Ya está en el máximo
  };

  return jerarquia[rarezaBase] || rarezaBase;
}
