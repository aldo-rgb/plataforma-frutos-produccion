import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * API: Generar Logos con DALL-E 3
 * Recibe concepto y descripción, devuelve 4 URLs de logos generados
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

    // Prompt optimizado para generar logos
    const logoPrompt = `Create a modern, minimalist logo for a business called "${concepto}". 
Description: ${descripcion || 'Professional service'}. 
Style: Clean, professional, suitable for digital and print. 
Background: Solid color or transparent-style (simple gradient acceptable).
Do NOT include any text in the logo, only an icon/symbol.
Make it memorable and unique.`;

    try {
      // Generar 4 logos con DALL-E 3
      const logoPromises = [];
      
      for (let i = 0; i < 4; i++) {
        logoPromises.push(
          openai.images.generate({
            model: 'dall-e-3',
            prompt: logoPrompt + ` Variation ${i + 1}: ${['geometric shapes', 'organic forms', 'abstract symbol', 'iconic representation'][i]}`,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
            style: 'vivid',
          })
        );
      }

      const results = await Promise.allSettled(logoPromises);
      
      const logos = results
        .filter((result): result is PromiseFulfilledResult<OpenAI.Images.ImagesResponse> => 
          result.status === 'fulfilled'
        )
        .map((result, index) => ({
          id: `logo-${Date.now()}-${index}`,
          url: result.value.data?.[0]?.url || '',
          selected: false
        }))
        .filter(logo => logo.url);

      if (logos.length === 0) {
        throw new Error('No se pudieron generar logos');
      }

      return NextResponse.json({ logos });

    } catch (dalleError: any) {
      console.error('DALL-E error:', dalleError);
      
      // Si DALL-E falla, devolver logos placeholder
      // En producción, podrías usar un servicio alternativo o logos prediseñados
      return NextResponse.json({
        logos: [
          { id: 'placeholder-1', url: 'https://placehold.co/400x400/7c3aed/ffffff?text=Logo+1', selected: false },
          { id: 'placeholder-2', url: 'https://placehold.co/400x400/f97316/ffffff?text=Logo+2', selected: false },
          { id: 'placeholder-3', url: 'https://placehold.co/400x400/10b981/ffffff?text=Logo+3', selected: false },
          { id: 'placeholder-4', url: 'https://placehold.co/400x400/3b82f6/ffffff?text=Logo+4', selected: false },
        ],
        note: 'Logos de ejemplo. La generación con IA está temporalmente limitada.'
      });
    }

  } catch (error) {
    console.error('❌ Error generando logos:', error);
    return NextResponse.json(
      { error: 'Error al generar logos' },
      { status: 500 }
    );
  }
}
