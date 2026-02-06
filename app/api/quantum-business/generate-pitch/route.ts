import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';
import logger from '@/lib/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * API: Generar Pitch/Descripción con IA
 * Recibe nombre, concepto y audiencia, devuelve descripción persuasiva y oferta
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { nombre, concepto, audiencia } = await request.json();

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    const prompt = `Actúa como un copywriter experto en ventas y persuasión.

Negocio: "${nombre}"
Concepto: "${concepto || 'Servicio profesional'}"
Audiencia objetivo: "${audiencia || 'Público general'}"

Genera:
1. Una descripción persuasiva del servicio (2-3 oraciones) que:
   - Use lenguaje emocional y beneficios claros
   - Sea fácil de leer y entender
   - Genere confianza y autoridad
   - NO suene genérico ni aburrido
   
2. Una oferta especial para la comunidad (ejemplos: descuento, consulta gratis, bonus)

Responde SOLO con un JSON válido en este formato exacto:
{
  "descripcion": "La descripción persuasiva aquí",
  "oferta": "15% de descuento para miembros de la comunidad"
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
      max_tokens: 500,
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
      logger.error('Error parsing AI response:', cleanedResponse);
      
      return NextResponse.json({
        descripcion: `${nombre} transforma la manera en que ${audiencia || 'las personas'} experimentan ${concepto || 'nuestros servicios'}. Con un enfoque personalizado y resultados comprobados, estamos aquí para llevarte al siguiente nivel.`,
        oferta: '15% de descuento exclusivo para miembros de la comunidad'
      });
    }

  } catch (error) {
    logger.error('❌ Error generando pitch:', error);
    return NextResponse.json(
      { error: 'Error al generar descripción' },
      { status: 500 }
    );
  }
}
