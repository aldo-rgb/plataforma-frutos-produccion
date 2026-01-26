import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * API: Mejorar Copywriting con IA
 * Recibe un texto básico y lo transforma en copy persuasivo
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { texto } = await request.json();

    if (!texto || texto.trim().length < 5) {
      return NextResponse.json(
        { error: 'El texto es requerido (mínimo 5 caracteres)' },
        { status: 400 }
      );
    }

    const prompt = `Actúa como un copywriter experto en ventas y persuasión.

Texto original del usuario (puede ser básico o aburrido):
"${texto}"

Tu tarea:
1. Reescribe este texto haciéndolo MUCHO más persuasivo y profesional
2. Mantén la esencia del mensaje original
3. Usa lenguaje emocional y beneficios claros
4. Hazlo sonar confiable y con autoridad
5. NO lo hagas más largo de 2-3 oraciones
6. NO uses clichés ni frases genéricas

Ejemplo de transformación:
- ANTES: "Vendo seguros"
- DESPUÉS: "Protejo el patrimonio de familias visionarias con estrategias financieras blindadas contra cualquier imprevisto."

Responde SOLO con un JSON válido en este formato exacto:
{
  "mejorado": "El texto mejorado aquí"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un copywriter experto. Responde SOLO con JSON válido, sin markdown ni explicaciones.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 300,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      const parsed = JSON.parse(cleanedResponse);
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error('Error parsing AI response:', cleanedResponse);
      
      // Si falla el parsing, intentar extraer el texto mejorado de otra forma
      const match = cleanedResponse.match(/"mejorado":\s*"([^"]+)"/);
      if (match) {
        return NextResponse.json({ mejorado: match[1] });
      }
      
      return NextResponse.json({
        mejorado: texto,
        note: 'No se pudo mejorar el texto automáticamente'
      });
    }

  } catch (error) {
    console.error('❌ Error mejorando copy:', error);
    return NextResponse.json(
      { error: 'Error al mejorar el texto' },
      { status: 500 }
    );
  }
}
