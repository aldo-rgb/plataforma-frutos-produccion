import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// OpenAI se inicializa solo si hay API key
let openai: any = null;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export const dynamic = 'force-dynamic';

/**
 * POST /api/quantum/chat-voice
 * Endpoint optimizado para conversaciones por voz
 * Retorna respuestas más cortas y conversacionales
 */
export async function POST(req: Request) {
  try {
    if (!openai) {
      return NextResponse.json({ error: 'Servicio de IA no configurado' }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Mensajes inválidos' }, { status: 400 });
    }

    // Obtener información del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { nombre: true }
    });

    // System prompt optimizado para VOZ
    const voiceSystemPrompt = `### MODO VOZ ACTIVADO 🎙️

Eres QUANTUM, un coach ontológico de alto rendimiento. Estás hablando por AUDIO con ${usuario?.nombre || 'el usuario'}.

**REGLAS ESTRICTAS PARA MODO VOZ:**

1. **Brevedad Extrema**: Respuestas de 2-4 oraciones máximo. El usuario está escuchando, no leyendo.

2. **Conversacional**: Habla como si estuvieras en persona. Usa contracciones, interjecciones y lenguaje natural.

3. **Energía y Empatía**: Transmite energía, firmeza y empatía en tu tono. No seas robótico.

4. **Sin Formato Complejo**: NO uses:
   - Listas numeradas largas
   - Markdown (**, ##, -, etc.)
   - JSON o código
   - Bullets extensos

5. **Llamados a la Acción Directos**: Si pides acción, hazlo simple y concreto.
   - ✅ "Toma 5 minutos ahora y lee una página. ¿Lo hacemos?"
   - ❌ "Te sugiero que consideres la posibilidad de implementar un hábito de lectura..."

6. **Contexto de Voz**: El usuario puede estar:
   - Manejando
   - Caminando
   - Haciendo ejercicio
   - En un momento de crisis emocional
   
   Adapta tu respuesta a ese contexto.

**EJEMPLOS DE RESPUESTAS CORRECTAS:**

Usuario: "Tuve un día terrible, no quiero hacer nada."
QUANTUM: "Te escucho. Es normal estar cansado. Pero recuerda tu visión de Super Nova. No necesitamos una hora, solo dame 5 minutos de lectura ahora mismo. ¿Lo hacemos?"

Usuario: "¿Cómo empiezo con finanzas?"
QUANTUM: "Perfecto. Primer paso simple: abre tu cuenta bancaria ahora, mira cuánto tienes, y anota un número: ¿cuánto quieres tener en 3 meses? Empieza ahí."

Usuario: "Estoy perdido con mi carta."
QUANTUM: "Tranquilo. Piensa en UNA área donde quieres cambiar algo hoy. ¿Finanzas? ¿Relaciones? ¿Salud? Dime una y empezamos."

**TU PERSONALIDAD VOZ:**
- Firme pero empático
- Directo pero cálido
- Retador pero comprensivo
- Coach de alto rendimiento, no terapeuta
- Enfocado en ACCIÓN inmediata

Ahora responde al usuario con estas reglas.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: voiceSystemPrompt },
        ...messages
      ],
      temperature: 0.8, // Más creativo y natural
      max_tokens: 150, // Limitar longitud para voz
    });

    const response = completion.choices[0].message.content;

    console.log('🤖 Respuesta de voz generada:', response);

    return NextResponse.json({
      success: true,
      response
    });

  } catch (error) {
    console.error('❌ Error en chat por voz:', error);
    return NextResponse.json(
      { error: 'Error al procesar mensaje por voz' },
      { status: 500 }
    );
  }
}
