import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';
import logger from '@/lib/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * API: Generar Nombres de Negocio con IA
 * Recibe concepto y descripción, devuelve 5 nombres creativos
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { concepto, descripcion } = await request.json();

    if (!concepto) {
      return NextResponse.json(
        { error: 'El concepto es requerido' },
        { status: 400 }
      );
    }

    const prompt = `Actúa como un experto en branding y naming de marcas.

El concepto del negocio es: "${concepto}"
Descripción: "${descripcion || 'No especificada'}"

Genera EXACTAMENTE 5 nombres creativos, memorables y únicos para este negocio.

Los nombres deben ser:
- Fáciles de pronunciar y recordar
- Cortos (1-3 palabras máximo)
- Únicos y diferenciadores
- Apropiados para el mercado hispano
- Pueden ser en español, inglés o una mezcla creativa

Responde SOLO con un JSON válido en este formato exacto:
{
  "nombres": ["Nombre1", "Nombre2", "Nombre3", "Nombre4", "Nombre5"]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en branding. Responde SOLO con JSON válido, sin markdown ni explicaciones.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
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
      logger.error('Error parsing AI response:', cleanedResponse);
      
      // Fallback con nombres basados en el concepto
      const baseWord = concepto.split(' ')[0];
      return NextResponse.json({
        nombres: [
          `${baseWord} Plus`,
          `${baseWord} Hub`,
          `${baseWord} Lab`,
          `${baseWord} Zone`,
          `Mi ${baseWord}`
        ]
      });
    }

  } catch (error) {
    logger.error('❌ Error generando nombres:', error);
    return NextResponse.json(
      { error: 'Error al generar nombres' },
      { status: 500 }
    );
  }
}
