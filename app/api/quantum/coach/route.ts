import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const SYSTEM_PROMPT = `Eres QUANTUM, coach ontológico del sistema F.R.U.T.O.S.
Tu ÚNICO objetivo es ayudar al usuario a construir sus "Declaraciones del Ser" para las áreas clave de su vida.

TU ALGORITMO DE CONVERSACIÓN:
1. SECUENCIALIDAD ESTRICTA: Debes abordar las áreas una por una en orden. No saltes a otra área hasta que el usuario haya definido la actual.
2. FORMATO DE SALIDA: La meta es obtener una frase que empiece obligatoriamente con "Yo soy..." seguida de una distinción de ser (ej: "Yo soy disciplinado", "Yo soy oferta").
3. TONO PRAGMÁTICO (CERO EMOCIONES):
   - PROHIBIDO preguntar "¿Cómo te sientes?", "¿Qué sientes al respecto?" o indagar en emociones.
   - Tu enfoque es ONTOLÓGICO (Ser y Hacer). Pregunta por compromisos, estándares y definiciones.
   - Ejemplo correcto: "¿Quién te comprometes a ser frente a tus finanzas?"
   - Ejemplo incorrecto: "¿Cómo te hace sentir tu situación financiera?"

FLUJO DE INTERACCIÓN:
- Pregunta por el área actual.
- Si el usuario responde vagamente, ayúdale a aterrizarlo en "Yo soy + [Manera de Ser]".
- Cuando el usuario defina una frase válida:
  1. RECONOCE la declaración con entusiasmo
  2. EXPLICA brevemente por qué es valiosa
  3. PIDE confirmación explícita
  4. Solo tras confirmación, registra y avanza: "Perfecto, declaración registrada ✓. Siguiente área: [Nombre]..."
- Di: "➡️ Pasemos al área de [Siguiente Área]. ¿Quién eres tú en...?"

**IMPORTANTE - FINALIZACIÓN AUTOMÁTICA:**
Cuando hayas completado TODAS las áreas requeridas, debes finalizar la conversación con un mensaje como:
"✅ ¡Excelente trabajo! Hemos completado tus declaraciones del SER en todas las áreas. Voy a guardar tu identidad ahora."

NO sigas haciendo preguntas después de completar todas las áreas. Finaliza inmediatamente.

IMPORTANTE: El número de áreas puede variar (6 u 8) según si el usuario pertenece a un grupo/visión. Siempre procesa TODAS las áreas que se te indiquen en el orden establecido.

EJEMPLO DE CONVERSACIÓN ESPERADA:
Usuario: "No sé qué poner en dinero."
QUANTUM: "Enfócate en tu compromiso. Para alcanzar la riqueza que deseas, ¿quién debes ser? ¿Un gastador o un inversionista? Define tu identidad: 'Yo soy...'"
Usuario: "Pues quiero ser alguien que invierte bien."
QUANTUM: "¿Podemos definirlo como 'Yo soy un inversionista inteligente y estratégico'? ¿Te funciona?"
Usuario: "Sí, esa me gusta."
QUANTUM: "Excelente elección. Esta declaración es poderosa porque define tu compromiso con el dinero. ¿Confirmamos que te declaras 'Yo soy un inversionista inteligente y estratégico'? Si es así, pasamos a la siguiente área."

IMPORTANTE AL VALIDAR:
- Reconoce la declaración con entusiasmo y especificidad
- Explica brevemente por qué es valiosa
- Pide confirmación antes de registrar
- Solo después de confirmación explícita, di algo como: "Perfecto, declaración registrada ✓" y avanza
- NO digas solo "Registrado" - sé humano y reconoce el trabajo del usuario

REGLAS CRÍTICAS:
- NO des respuestas directas. Guía con preguntas de compromiso.
- Declaraciones en PRESENTE: "Yo soy..."
- Son declaraciones de IDENTIDAD, no metas.
- Cambia de área INMEDIATAMENTE tras validar una declaración.
- Mantén el tono estoico, directo y sin emociones.`;

const FINALIZATION_PROMPT = `Basándote en toda la conversación anterior, extrae y genera las declaraciones del SER que el usuario ha descubierto o acordado.

FORMATO DE SALIDA ESTRICTO - SOLO DEVUELVE EL JSON, SIN TEXTO ADICIONAL:
{
  "finanzas": "Yo soy...",
  "relaciones": "Yo soy...",
  "talentos": "Yo soy...",
  "salud": "Yo soy...",
  "pazMental": "Yo soy...",
  "ocio": "Yo soy...",
  "servicioTrans": "Yo soy...",
  "servicioComun": "Yo soy..."
}

REGLAS:
- Solo incluye las áreas que fueron discutidas en la conversación
- Si un área no fue discutida, omítela del JSON
- Cada declaración debe comenzar con "Yo soy"
- Si el usuario ya tenía una declaración y no la modificó, mantenla
- Asegúrate de que sea JSON válido`;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { action, conversationId, message, conversationHistory, currentDeclaraciones, perteneceAGrupo = false, areasActivas: areasActivasRecibidas } = body;
    
    // Usar áreas activas recibidas del cliente, o usar defaults como fallback
    const areasConfig = areasActivasRecibidas || (perteneceAGrupo
      ? [
          { emoji: '💰', name: 'FINANZAS', key: 'finanzas' },
          { emoji: '💪', name: 'SALUD', key: 'salud' },
          { emoji: '❤️', name: 'RELACIONES', key: 'relaciones' },
          { emoji: '🎨', name: 'TALENTOS', key: 'talentos' },
          { emoji: '🧘', name: 'PAZ MENTAL', key: 'pazMental' },
          { emoji: '🎮', name: 'OCIO', key: 'ocio' },
          { emoji: '🌟', name: 'SERVICIO TRANSFORMACIONAL', key: 'servicioTrans' },
          { emoji: '🤝', name: 'SERVICIO COMUNITARIO', key: 'servicioComun' }
        ]
      : [
          { emoji: '💰', name: 'FINANZAS', key: 'finanzas' },
          { emoji: '💪', name: 'SALUD', key: 'salud' },
          { emoji: '❤️', name: 'RELACIONES', key: 'relaciones' },
          { emoji: '🎨', name: 'TALENTOS', key: 'talentos' },
          { emoji: '🧘', name: 'PAZ MENTAL', key: 'pazMental' },
          { emoji: '🎮', name: 'OCIO', key: 'ocio' }
        ]);

    // ACCIÓN: Inicializar conversación
    if (action === 'initialize') {
      const hasExistingDeclaraciones = currentDeclaraciones && Object.keys(currentDeclaraciones).length > 0;
      
      const areasListText = areasConfig.map(a => `${a.emoji} ${a.name || a.nombre}`).join(' → ');
      const totalAreas = areasConfig.length;
      
      let initialMessage = `⚡ QUANTUM - Conectado al campo cuántico

Soy Quantum. Vamos a construir declaraciones precisas del SER para ${totalAreas} áreas de tu vida.

**PROTOCOLO:**
1. Te preguntaré por cada área en secuencia
2. Defines "Yo soy + [manera de ser]"
3. Validamos y avanzamos inmediatamente

**ÁREAS:** ${areasListText}

`;

      if (hasExistingDeclaraciones) {
        initialMessage += `📊 Declaraciones existentes detectadas. Puedo ayudarte a refinarlas o completar las faltantes.\n\n`;
      }

      initialMessage += `**¿Comenzamos?**

1️⃣ Sí, guíame área por área
2️⃣ Primero explícame qué es una "declaración del SER"`;

      return NextResponse.json({ message: initialMessage });
    }

    // ACCIÓN: Chat normal
    if (action === 'chat') {
      const { areasRequeridas = 6 } = body;
      const areasKeys = areasConfig.map(a => a.key);
      
      // Contar áreas ya completadas
      const areasCompletadas = areasKeys.filter(key => 
        currentDeclaraciones?.[key] && currentDeclaraciones[key].trim().length > 0
      );
      
      const contextMessage = `\n\n[CONTEXTO DEL SISTEMA - NO MENCIONES ESTO AL USUARIO]
Áreas configuradas para este usuario: ${areasConfig.map(a => `${a.emoji} ${a.name || a.nombre}`).join(', ')}
Total de áreas: ${areasConfig.length}
Áreas completadas: ${areasCompletadas.length}
Áreas pendientes: ${areasConfig.length - areasCompletadas.length}
Declaraciones registradas: ${areasCompletadas.map(k => areasConfig.find(a => a.key === k)?.name || areasConfig.find(a => a.key === k)?.nombre).join(', ') || 'Ninguna'}

${areasCompletadas.length >= areasConfig.length ? 
  'TODAS LAS ÁREAS COMPLETADAS - Debes finalizar la conversación en tu próxima respuesta con un mensaje de despedida y confirmación de que vas a guardar.' : 
  `Siguiente área a trabajar: ${areasConfig[areasCompletadas.length]?.name || areasConfig[areasCompletadas.length]?.nombre || 'N/A'}`}`;
      
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT + contextMessage },
        ...(conversationHistory || []).slice(-6), // Últimos 6 mensajes para contexto
        { role: 'user', content: message }
      ];

      // Llamada a OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.8,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('OpenAI API Error:', error);
        throw new Error('Error al comunicarse con la IA');
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message.content;
      
      // Detectar si QUANTUM completó todas las áreas
      const declaracionesCompletas = areasCompletadas.length;
      
      // Si ya se completaron todas las áreas configuradas
      const shouldFinalize = declaracionesCompletas >= areasConfig.length;

      return NextResponse.json({ 
        message: assistantMessage,
        shouldFinalize,
        progress: `${declaracionesCompletas}/${areasConfig.length}`,
        areasCompletadas: areasCompletadas.length
      });
    }

    // ACCIÓN: Finalizar y extraer declaraciones
    if (action === 'finalize') {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...(conversationHistory || []),
        { role: 'system', content: FINALIZATION_PROMPT }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.3,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        throw new Error('Error al finalizar la conversación');
      }

      const data = await response.json();
      let content = data.choices[0].message.content;

      // Extraer JSON del contenido
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const declaraciones = JSON.parse(jsonMatch[0]);
        
        // Fusionar con declaraciones existentes
        const finalDeclaraciones = {
          ...currentDeclaraciones,
          ...declaraciones
        };

        return NextResponse.json({ 
          declaraciones: finalDeclaraciones,
          message: 'Declaraciones extraídas exitosamente'
        });
      }

      throw new Error('No se pudo extraer el JSON de declaraciones');
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error: any) {
    console.error('❌ Error en Quantum Coach:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
