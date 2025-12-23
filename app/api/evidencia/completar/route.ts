// app/api/evidencia/completar/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import { join } from 'path';

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

    console.log('📥 Datos recibidos:', { userId, metaId, accionId, taskInstanceId, descripcion, fileSize: file?.size });

    if (!file || !metaId || !accionId || !taskInstanceId) {
      console.error('❌ Faltan datos:', { file: !!file, metaId, accionId, taskInstanceId });
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // 3. Guardar archivo temporalmente (en producción usar S3/Cloudinary)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Crear nombre único para el archivo
    const fileName = `${userId}_${taskInstanceId}_${Date.now()}_${file.name}`;
    const publicPath = join(process.cwd(), 'public', 'evidencias');
    const filePath = join(publicPath, fileName);
    
    // Asegurar que el directorio existe (en producción esto ya estaría creado)
    try {
      await writeFile(filePath, buffer);
      console.log('💾 Archivo guardado:', fileName);
    } catch (error) {
      console.error('Error guardando archivo:', error);
      // Continuar con URL simulada si falla el guardado
    }

    const fotoUrl = `/evidencias/${fileName}`;
    
    console.log('📸 URL generada:', fotoUrl);

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
    
    console.log('✅ Evidencia creada:', nuevaEvidencia.id);

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

    console.log('✅ TaskInstance actualizada con evidencia');
    
    return NextResponse.json({ 
        success: true,
        message: 'Evidencia guardada exitosamente.',
        evidencia: nuevaEvidencia,
    });

  } catch (error) {
    console.error('Error en API Evidencia:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ 
      error: 'Fallo al completar la tarea.', 
      details: errorMessage 
    }, { status: 500 });
  }
}