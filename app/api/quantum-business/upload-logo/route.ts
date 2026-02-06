import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fteqhmntkmmppxufjrwt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * API: Subir logo a Supabase Storage
 * Recibe URL temporal de DALL-E, descarga la imagen y la sube a Supabase
 * Retorna URL permanente y guarda en The Vault como Artefacto
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { logoUrl, businessName } = await request.json();

    if (!logoUrl) {
      return NextResponse.json(
        { error: 'La URL del logo es requerida' },
        { status: 400 }
      );
    }

    // Descargar la imagen desde la URL temporal de DALL-E
    logger.debug('📥 Descargando imagen desde:', logoUrl.substring(0, 50) + '...');
    
    const imageResponse = await fetch(logoUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'No se pudo descargar la imagen del logo' },
        { status: 400 }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageData = new Uint8Array(imageBuffer);

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const sanitizedName = businessName 
      ? businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)
      : 'logo';
    const fileName = `business-logos/${session.user.id}/${sanitizedName}-${timestamp}.png`;

    logger.debug('📤 Subiendo a Supabase Storage:', fileName);

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('mentor-assets')
      .upload(fileName, imageData, {
        contentType: 'image/png',
        cacheControl: '31536000', // 1 año de cache
        upsert: true
      });

    if (error) {
      logger.error('❌ Error subiendo a Supabase:', error);
      return NextResponse.json(
        { error: 'Error al subir el logo: ' + error.message },
        { status: 500 }
      );
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('mentor-assets')
      .getPublicUrl(fileName);

    logger.debug('✅ Logo subido exitosamente:', publicUrl);

    // Guardar en The Vault como Artefacto
    try {
      const logoLabel = businessName 
        ? `🎨 Logo: ${businessName}`
        : '🎨 Logo de Negocio';
      
      await prisma.avatarGenerationAttempt.create({
        data: {
          usuarioId: userId,
          sourceImage: 'business-logo',
          generatedUrl: publicUrl,
          vibe: logoLabel,
          gender: 'neutro'
        }
      });
      logger.debug(`🎨 Logo guardado en The Vault (Artefactos) para usuario ${userId}: ${logoLabel}`);
    } catch (vaultError) {
      // No fallar si no se puede guardar en vault
      logger.error('Error guardando logo en vault:', vaultError);
    }

    return NextResponse.json({ 
      success: true,
      permanentUrl: publicUrl,
      path: data.path
    });

  } catch (error) {
    logger.error('❌ Error en upload-logo:', error);
    return NextResponse.json(
      { error: 'Error al procesar el logo' },
      { status: 500 }
    );
  }
}
