import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';
import logger from '@/lib/logger';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * API: Subir imagen desde URL a Cloudinary
 * Útil para persistir imágenes generadas por DALL-E (URLs temporales)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { imageUrl, folder = 'uploads' } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'La URL de la imagen es requerida' },
        { status: 400 }
      );
    }

    // Subir la imagen desde URL a Cloudinary
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: `frutos/${folder}`,
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height
    });

  } catch (error: any) {
    logger.error('❌ Error subiendo imagen desde URL:', error);
    return NextResponse.json(
      { error: 'Error al subir la imagen', details: error.message },
      { status: 500 }
    );
  }
}
