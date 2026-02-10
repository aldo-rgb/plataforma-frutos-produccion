import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
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
  logger.debug('📷 POST /api/upload/profile-image - Iniciando');
  
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('❌ No hay sesión de usuario');
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    logger.debug('✅ Usuario autenticado:', session.user.id);

    // Obtener el archivo del FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      logger.warn('❌ No se proporcionó archivo');
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    logger.debug('📁 Archivo recibido:', file.name, 'tipo:', file.type, 'tamaño:', file.size);

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      logger.warn('❌ Tipo de archivo inválido:', file.type);
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
    }

    // Validar tamaño (5MB máximo - límite de Supabase storage)
    if (file.size > 5 * 1024 * 1024) {
      logger.warn('❌ Archivo muy grande:', file.size);
      return NextResponse.json({ error: 'La imagen no puede superar los 5MB' }, { status: 400 });
    }

    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
    const filePath = `profile-images/${fileName}`;

    logger.debug('📂 Subiendo a:', filePath);

    // Convertir el archivo a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    logger.debug('📊 Buffer size:', buffer.length);

    // Subir a Supabase Storage
    let supabaseClient;
    try {
      supabaseClient = getSupabaseClient();
    } catch (configError: any) {
      logger.error('❌ Error de configuración Supabase:', configError.message);
      return NextResponse.json({ 
        error: 'Servicio de almacenamiento no configurado. Contacta soporte.' 
      }, { status: 503 });
    }

    const { data, error } = await supabaseClient.storage
      .from('mentor-assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      logger.error('❌ Error subiendo a Supabase:', error.message, error);
      return NextResponse.json({ 
        error: `Error al subir la imagen: ${error.message}` 
      }, { status: 500 });
    }

    logger.debug('✅ Archivo subido exitosamente');

    // Obtener URL pública
    const { data: { publicUrl } } = supabaseClient.storage
      .from('mentor-assets')
      .getPublicUrl(filePath);

    logger.debug('🔗 URL pública:', publicUrl);

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