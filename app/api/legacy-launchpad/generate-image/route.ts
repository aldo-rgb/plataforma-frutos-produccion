import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';
import sharp from 'sharp';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { prompt, logoUrl, projectTitle } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 });
    }

    // Generar imagen base con DALL-E 3
    const enhancedPrompt = `${prompt}. Photorealistic, high quality, 8k resolution, bright lighting, hopeful atmosphere, community service, social impact. NO text or letters in the image.`;

    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1792x1024', // 16:9 aspect ratio
      quality: 'standard',
      style: 'natural',
    });

    const generatedImageUrl = imageResponse.data?.[0]?.url;

    if (!generatedImageUrl) {
      return NextResponse.json({ error: 'No se pudo generar la imagen' }, { status: 500 });
    }

    // Si hay logo, fusionar con la imagen
    let finalImageUrl = generatedImageUrl;
    let finalImageBuffer: Buffer | null = null;

    if (logoUrl) {
      try {
        // Descargar la imagen generada
        const imageRes = await fetch(generatedImageUrl);
        const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

        // Descargar el logo
        const logoRes = await fetch(logoUrl);
        const logoBuffer = Buffer.from(await logoRes.arrayBuffer());

        // Redimensionar logo (máximo 150px de ancho, mantener transparencia)
        const resizedLogo = await sharp(logoBuffer)
          .resize({ width: 150, height: 150, fit: 'inside' })
          .png()
          .toBuffer();

        // Obtener dimensiones de la imagen base
        const baseMetadata = await sharp(imageBuffer).metadata();
        const baseWidth = baseMetadata.width || 1792;
        const baseHeight = baseMetadata.height || 1024;

        // Posición del logo: esquina superior derecha con padding
        const logoMetadata = await sharp(resizedLogo).metadata();
        const logoWidth = logoMetadata.width || 150;
        const logoHeight = logoMetadata.height || 150;
        const padding = 30;

        // Fusionar imágenes
        finalImageBuffer = await sharp(imageBuffer)
          .composite([
            {
              input: resizedLogo,
              top: padding,
              left: baseWidth - logoWidth - padding,
            },
          ])
          .jpeg({ quality: 90 })
          .toBuffer();

        // Convertir a base64 data URL para enviar al cliente
        const base64Image = finalImageBuffer.toString('base64');
        finalImageUrl = `data:image/jpeg;base64,${base64Image}`;

      } catch (logoError) {
        console.error('Error processing logo:', logoError);
        // Si falla, usar la imagen original sin logo
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl: finalImageUrl,
      originalUrl: generatedImageUrl,
      hasLogo: !!logoUrl && finalImageBuffer !== null,
      revisedPrompt: imageResponse.data?.[0]?.revised_prompt,
    });

  } catch (error) {
    console.error('Error in generate-image API:', error);
    
    // Manejar errores específicos de OpenAI
    if (error instanceof OpenAI.APIError) {
      if (error.status === 400) {
        return NextResponse.json({ 
          error: 'El prompt fue rechazado por las políticas de contenido',
          details: error.message 
        }, { status: 400 });
      }
    }

    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
