import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';
import logger from '@/lib/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { text, projectId } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Texto requerido' }, { status: 400 });
    }

    // Prompt para GPT-4 para analizar el texto del proyecto
    const systemPrompt = `Eres un analista de proyectos sociales. Tu trabajo es analizar textos no estructurados de proyectos comunitarios y extraer información clave.

IMPORTANTE: Responde SOLO con JSON válido, sin explicaciones adicionales.

El JSON debe tener esta estructura exacta:
{
  "title": "Título inspirador corto para el proyecto (máximo 5 palabras)",
  "description": "Descripción emotiva del proyecto (2-3 oraciones)",
  "story": "Historia más larga y emotiva para la página de donaciones (4-6 oraciones)",
  "activity": "Tipo de actividad (ej: Plantación de árboles, Entrega de despensas, etc.)",
  "beneficiaries": "Descripción de beneficiarios (ej: 300 ciudadanos, 50 familias, etc.)",
  "beneficiariesCount": número estimado de beneficiarios,
  "duration": "Duración del proyecto (ej: 1 día, 1 semana, etc.)",
  "totalBudget": número total del presupuesto en pesos mexicanos,
  "budgetBreakdown": [
    { "item": "Nombre del gasto", "amount": número, "percentage": número }
  ],
  "category": "ECOLOGICAL|CHILDREN|ELDERLY|ANIMALS|EDUCATION|HEALTH|HOUSING|FOOD|OTHER",
  "keywords": ["palabra1", "palabra2", "palabra3"],
  "imagePrompt": "Prompt en inglés para generar una imagen inspiradora del proyecto con DALL-E"
}

Si algún campo no está explícito en el texto, infiere un valor razonable basándote en el contexto.
Para el imagePrompt, crea un prompt detallado en inglés que genere una imagen fotorealista, inspiradora, con buena iluminación, que transmita esperanza y comunidad.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analiza el siguiente texto de proyecto:\n\n${text}` }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    
    // Limpiar el JSON (a veces GPT agrega markdown)
    let cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let parsedData;
    try {
      parsedData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      logger.error('Error parsing GPT response:', cleanedResponse);
      return NextResponse.json({ 
        error: 'Error al procesar la respuesta de IA',
        raw: cleanedResponse 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
    });

  } catch (error) {
    logger.error('Error in parse API:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
