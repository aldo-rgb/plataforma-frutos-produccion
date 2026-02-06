import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import logger from '@/lib/logger';

/**
 * POST /api/school-admin/licenses/upload-proof
 * Sube el comprobante de pago de una transferencia bancaria
 */
export async function POST(req: NextRequest) {
  try {
    logger.debug('📤 Iniciando upload de comprobante...');
    
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      logger.error('❌ No hay sesión activa');
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    logger.debug('✅ Usuario autenticado:', session.user.email, 'Rol:', session.user.rol);

    if (session.user.rol !== 'SCHOOL_ADMIN') {
      logger.error('❌ Usuario no es SCHOOL_ADMIN:', session.user.rol);
      return NextResponse.json(
        { success: false, error: 'Solo directores de escuela pueden subir comprobantes' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const orderId = formData.get('orderId') as string;

    logger.debug('📦 Datos recibidos - File:', file?.name, 'Size:', file?.size, 'OrderID:', orderId);

    if (!file) {
      logger.error('❌ No se proporcionó archivo');
      return NextResponse.json(
        { success: false, error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    if (!orderId) {
      logger.error('❌ No se proporcionó ID de orden');
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ID de orden' },
        { status: 400 }
      );
    }

    // Validar tamaño (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      logger.error('❌ Archivo muy grande:', file.size);
      return NextResponse.json(
        { success: false, error: 'El archivo no debe superar 5MB' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      logger.error('❌ Tipo de archivo no válido:', file.type);
      return NextResponse.json(
        { success: false, error: 'Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP) o PDF' },
        { status: 400 }
      );
    }

    logger.debug('✅ Validaciones pasadas');

    // Crear directorio si no existe
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'payment-proofs');
    logger.debug('📁 Directorio de upload:', uploadDir);
    
    try {
      await mkdir(uploadDir, { recursive: true });
      logger.debug('✅ Directorio verificado/creado');
    } catch (error) {
      logger.debug('ℹ️ El directorio ya existe');
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `proof-${orderId}-${timestamp}.${extension}`;
    const filepath = join(uploadDir, filename);

    logger.debug('💾 Guardando archivo como:', filename);

    // Convertir el archivo a buffer y guardarlo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    logger.debug('✅ Archivo guardado exitosamente');

    // URL pública del archivo
    const publicUrl = `/uploads/payment-proofs/${filename}`;

    logger.debug(`✅ Comprobante subido: ${publicUrl}`);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
    });
  } catch (error: any) {
    logger.error('❌ Error al subir comprobante:', error);
    logger.error('Stack trace:', error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al subir el comprobante',
      },
      { status: 500 }
    );
  }
}
