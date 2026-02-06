import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

// Función para obtener cliente de Supabase (lazy initialization)
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  logger.debug('🔧 Supabase Config Check:');
  logger.debug('  - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Configurado' : '❌ FALTA');
  logger.debug('  - SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ Configurado' : '❌ FALTA');
  
  if (!supabaseUrl || !supabaseKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    throw new Error(`Missing Supabase environment variables: ${missing.join(', ')}`);
  }
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener el archivo del FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
    }

    // Validar tamaño (10MB máximo)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no puede superar los 10MB' }, { status: 400 });
    }

    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
    const filePath = `profile-images/${fileName}`;

    // Convertir el archivo a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir a Supabase Storage
    const { data, error } = await getSupabaseClient().storage
      .from('mentor-assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      logger.error('Error subiendo a Supabase:', error);
      return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
    }

    // Obtener URL pública
    const { data: { publicUrl } } = getSupabaseClient().storage
      .from('mentor-assets')
      .getPublicUrl(filePath);

    // Actualizar el perfil del usuario con la nueva imagen
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Obtener usuario actual para guardar foto anterior en vault
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { id: true, profileImage: true }
    });

    // Guardar foto anterior en The Vault si existe
    if (usuario?.profileImage) {
      try {
        await prisma.avatarGenerationAttempt.create({
          data: {
            usuarioId: usuario.id,
            generatedUrl: usuario.profileImage,
            vibe: 'profile-backup',
            gender: 'neutral',
            sourceImage: 'previous-profile'
          }
        });
        logger.debug('📸 Foto anterior guardada en The Vault');
      } catch (vaultError) {
        logger.error('⚠️ Error guardando en vault (continuando):', vaultError);
      }
    }

    await prisma.usuario.update({
      where: { id: parseInt(session.user.id) },
      data: { profileImage: publicUrl },
    });

    await prisma.$disconnect();

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      message: 'Imagen subida exitosamente'
    });

  } catch (error: any) {
    logger.error('Error en upload:', error);
    
    // Mensajes de error más específicos
    let errorMessage = 'Error interno del servidor';
    
    if (error?.message?.includes('Supabase environment')) {
      errorMessage = 'El servicio de almacenamiento no está configurado correctamente';
    } else if (error?.message?.includes('storage')) {
      errorMessage = 'Error al almacenar la imagen. Intenta de nuevo.';
    } else if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      errorMessage = 'No se pudo conectar con el servidor de almacenamiento';
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}