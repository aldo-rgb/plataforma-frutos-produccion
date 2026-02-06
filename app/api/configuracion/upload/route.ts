import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const field = formData.get('field') as string;

    if (!file || !field) {
      return NextResponse.json(
        { success: false, error: 'Archivo o campo no proporcionado' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de archivo no permitido' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'El archivo es demasiado grande (máximo 10MB)' },
        { status: 400 }
      );
    }

    // Generar nombre único
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `${field}_${timestamp}.${extension}`;

    // Crear directorio si no existe
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'configuracion');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Guardar archivo
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // URL pública
    const publicUrl = `/uploads/configuracion/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename
    });

  } catch (error: any) {
    logger.error('❌ Error en POST /api/configuracion/upload:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al subir archivo' },
      { status: 500 }
    );
  }
}
