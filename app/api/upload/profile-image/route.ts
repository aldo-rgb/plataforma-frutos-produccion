import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no puede superar los 5MB' }, { status: 400 });
    }

    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
    const filePath = `profile-images/${fileName}`;

    // Convertir el archivo a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('mentor-assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error('Error subiendo a Supabase:', error);
      return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('mentor-assets')
      .getPublicUrl(filePath);

    // Actualizar el perfil del usuario con la nueva imagen
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    await prisma.usuario.update({
      where: { id: session.user.id },
      data: { profileImage: publicUrl },
    });

    await prisma.$disconnect();

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      message: 'Imagen subida exitosamente'
    });

  } catch (error) {
    console.error('Error en upload:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
