/**
 * API para generar logos con AI (DALL-E 3)
 * POST /api/identity-lab/generate-logos
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';
import { v2 as cloudinary } from 'cloudinary';
import logger from '@/lib/logger';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Inicializar OpenAI
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!openai) {
      return NextResponse.json({ error: 'OpenAI no está configurado' }, { status: 500 });
    }

    const body = await request.json();
    const { tribeName, tribeDescription, visionId } = body;

    if (!tribeName) {
      return NextResponse.json({ error: 'El nombre de la tribu es requerido' }, { status: 400 });
    }

    logger.debug(`[Generate Logos] Generando 4 logos para tribu: ${tribeName}`);

    // Prompt base para generación de logos
    const basePrompt = `Create a modern, minimalist logo design for a team/tribe called "${tribeName}". 
${tribeDescription ? `The team's description: ${tribeDescription}` : ''}

Requirements:
- Clean, professional design suitable for t-shirts and branding
- Single icon/symbol style (no text in the image)
- Modern and memorable
- Works well in both color and black/white
- Simple enough to be recognizable at small sizes
- Style: flat design, geometric, or modern illustration
- Background: solid color or transparent look
- Colors: vibrant but professional

The logo should evoke: unity, strength, achievement, and team spirit.`;

    // Generar 4 variaciones con diferentes estilos
    const styleVariations = [
      'geometric abstract style with bold shapes',
      'modern minimalist style with clean lines',
      'dynamic sports-inspired style with movement',
      'elegant professional style with subtle details'
    ];

    const generatedLogos: { title: string; imageUrl: string; style: string }[] = [];

    // Generar las 4 imágenes en paralelo
    const generatePromises = styleVariations.map(async (style, index) => {
      const prompt = `${basePrompt}\n\nSpecific style for this variation: ${style}`;
      
      try {
        logger.debug(`[Generate Logos] Generando logo ${index + 1}/4...`);
        
        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          response_format: 'url'
        });

        const imageUrl = response.data?.[0]?.url;
        
        if (!imageUrl) {
          throw new Error('No se generó imagen');
        }

        // Subir a Cloudinary para persistencia
        const uploadResult = await cloudinary.uploader.upload(imageUrl, {
          folder: `identity-lab/${visionId || 'general'}/generated`,
          public_id: `logo_ai_${Date.now()}_${index}`,
          resource_type: 'image',
        });

        return {
          title: `Diseño ${index + 1}`,
          imageUrl: uploadResult.secure_url,
          style: style
        };
      } catch (err) {
        logger.error(`[Generate Logos] Error generando logo ${index + 1}:`, err);
        return null;
      }
    });

    const results = await Promise.all(generatePromises);
    
    // Filtrar los que se generaron exitosamente
    for (const result of results) {
      if (result) {
        generatedLogos.push(result);
      }
    }

    if (generatedLogos.length === 0) {
      return NextResponse.json(
        { error: 'No se pudieron generar los logos. Intenta de nuevo.' }, 
        { status: 500 }
      );
    }

    logger.debug(`[Generate Logos] Se generaron ${generatedLogos.length} logos exitosamente`);

    return NextResponse.json({
      success: true,
      logos: generatedLogos,
      message: `Se generaron ${generatedLogos.length} opciones de logo`
    });

  } catch (error) {
    logger.error('[Generate Logos] Error:', error);
    return NextResponse.json(
      { error: 'Error al generar logos' }, 
      { status: 500 }
    );
  }
}
