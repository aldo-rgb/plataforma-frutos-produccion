import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';
import logger from '@/lib/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * API: Generar Ideas de Negocio con IA
 * Recibe talento y audiencia, devuelve 3 ideas de negocio
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { talento, audiencia } = await request.json();

    if (!talento || !audiencia) {
      return NextResponse.json(
        { error: 'Talento y audiencia son requeridos' },
        { status: 400 }
      );
    }

    const prompt = `Actúa como un experto consultor de negocios y branding con experiencia en startups exitosas.

El usuario tiene el siguiente talento/habilidad: "${talento}"
Quiere servir a esta audiencia: "${audiencia}"

Genera EXACTAMENTE 3 ideas de negocio innovadoras, rentables y escalables basadas en esta información.

Para cada idea proporciona:
1. nombre: Un nombre creativo y memorable para el negocio (máximo 3 palabras)
2. slogan: Un slogan corto y pegajoso (máximo 8 palabras)
3. descripcion: Una descripción de 1-2 oraciones que explique el valor único
4. audiencia: Describe específicamente quién sería el cliente ideal

Responde SOLO con un JSON válido en este formato exacto:
{
  "ideas": [
    {
      "nombre": "Nombre del negocio",
      "slogan": "Slogan corto",
      "descripcion": "Descripción del servicio/producto",
      "audiencia": "Cliente ideal específico"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto consultor de negocios. Responde SOLO con JSON válido, sin markdown ni explicaciones adicionales.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Limpiar la respuesta de posibles caracteres extra
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      const parsed = JSON.parse(cleanedResponse);
      return NextResponse.json(parsed);
    } catch (parseError) {
      logger.error('Error parsing AI response:', cleanedResponse);
      
      // Fallback con ideas predefinidas basadas en el input
      return NextResponse.json({
        ideas: [
          {
            nombre: `${talento.split(' ')[0]} Pro`,
            slogan: "Tu talento, tu imperio",
            descripcion: `Servicio profesional de ${talento.toLowerCase()} diseñado para ${audiencia.toLowerCase()}.`,
            audiencia: audiencia
          },
          {
            nombre: `${talento.split(' ')[0]} Academy`,
            slogan: "Aprende de los mejores",
            descripcion: `Cursos y mentoría en ${talento.toLowerCase()} para quienes quieren dominar esta habilidad.`,
            audiencia: `Personas interesadas en aprender ${talento.toLowerCase()}`
          },
          {
            nombre: `${talento.split(' ')[0]} Solutions`,
            slogan: "Soluciones que transforman",
            descripcion: `Consultoría especializada en ${talento.toLowerCase()} con enfoque en resultados.`,
            audiencia: audiencia
          }
        ]
      });
    }

  } catch (error) {
    logger.error('❌ Error generando ideas:', error);
    return NextResponse.json(
      { error: 'Error al generar ideas de negocio' },
      { status: 500 }
    );
  }
}
