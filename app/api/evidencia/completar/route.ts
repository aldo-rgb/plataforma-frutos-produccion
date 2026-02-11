// app/api/evidencia/completar/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

// Función para obtener cliente de Supabase
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(req: Request) {
  try {
    // 1. Obtener la sesión del usuario
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' 
      ? parseInt(session.user.id, 10) 
      : session.user.id;

    // 2. Leer FormData con la imagen
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const metaId = parseInt(formData.get('metaId') as string);
    const accionId = parseInt(formData.get('accionId') as string);
    const descripcion = formData.get('descripcion') as string;
    const taskInstanceId = parseInt(formData.get('taskInstanceId') as string);

    logger.debug('📥 Datos recibidos:', { userId, metaId, accionId, taskInstanceId, descripcion, fileSize: file?.size });

    if (!file || !metaId || !accionId || !taskInstanceId) {
      logger.error('❌ Faltan datos:', { file: !!file, metaId, accionId, taskInstanceId });
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // 3. Subir archivo a Supabase Storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Limpiar nombre de archivo (quitar caracteres especiales)
    const cleanFileName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Reemplazar especiales con _
      .replace(/_+/g, '_'); // Quitar múltiples _
    
    const fileName = `evidencia_${userId}_${taskInstanceId}_${Date.now()}_${cleanFileName}`;
    
    let fotoUrl: string;
    
    try {
      const supabase = getSupabaseClient();
      
      // Subir a Supabase Storage en bucket "mentor-assets" (carpeta evidencias/)
      // Usamos mentor-assets porque es el bucket que ya existe y está configurado como público
      const filePath = `evidencias/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('mentor-assets')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: true // Permitir sobrescribir si existe
        });

      if (uploadError) {
        logger.error('Error subiendo a Supabase:', uploadError);
        throw uploadError;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('mentor-assets')
        .getPublicUrl(filePath);

      fotoUrl = urlData.publicUrl;
      logger.debug('📸 Archivo subido a Supabase:', fotoUrl);
      
    } catch (storageError) {
      logger.error('Error con Supabase Storage, intentando guardar localmente:', storageError);
      
      // Fallback: guardar localmente si Supabase falla
      const { writeFile } = await import('fs/promises');
      const { join } = await import('path');
      const { mkdir } = await import('fs/promises');
      
      const publicPath = join(process.cwd(), 'public', 'evidencias');
      const filePath = join(publicPath, fileName);
      
      try {
        await mkdir(publicPath, { recursive: true });
        await writeFile(filePath, buffer);
        fotoUrl = `/evidencias/${fileName}`;
        logger.debug('💾 Archivo guardado localmente:', fotoUrl);
      } catch (localError) {
        logger.error('Error guardando localmente:', localError);
        return NextResponse.json({ 
          error: 'No se pudo guardar la evidencia',
          details: 'Error en almacenamiento'
        }, { status: 500 });
      }
    }
    
    logger.debug('📸 URL final:', fotoUrl);

    // 4. Crear registro de evidencia
    const nuevaEvidencia = await prisma.evidenciaAccion.create({
      data: {
        usuarioId: userId,
        metaId: metaId,
        accionId: accionId,
        fotoUrl: fotoUrl,
        descripcion: descripcion || '',
        estado: 'PENDIENTE',
        fechaSubida: new Date(),
        updatedAt: new Date(),
      },
    });
    
    logger.debug('✅ Evidencia creada:', nuevaEvidencia.id);

    // 5. Actualizar TaskInstance con la evidencia y cambiar estado
    await prisma.taskInstance.update({
      where: { id: taskInstanceId },
      data: {
        evidenceUrl: fotoUrl,
        evidenceStatus: 'PENDING', // Bloqueada hasta que mentor apruebe
        evidenciaId: nuevaEvidencia.id,
        updatedAt: new Date(),
      },
    });

    logger.debug('✅ TaskInstance actualizada con evidencia');
    
    return NextResponse.json({ 
        success: true,
        message: 'Evidencia guardada exitosamente.',
        evidencia: nuevaEvidencia,
    });

  } catch (error) {
    logger.error('Error en API Evidencia:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ 
      error: 'Fallo al completar la tarea.', 
      details: errorMessage 
    }, { status: 500 });
  }
}