import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

// Cliente de Supabase para storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo (solo imágenes)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Solo se permiten imágenes (JPG, PNG, WebP)' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'La imagen es demasiado grande (máximo 5MB)' },
        { status: 400 }
      );
    }

    // Obtener usuario
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, profileImage: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `profile_${user.id}_${timestamp}.${extension}`;
    const filePath = `profile-photos/${filename}`;

    // Convertir archivo a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      logger.error('❌ Error subiendo foto a Supabase:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Error al subir la imagen' },
        { status: 500 }
      );
    }

    // Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const profileImageUrl = publicUrlData.publicUrl;

    // Actualizar usuario en la base de datos
    await prisma.usuario.update({
      where: { id: user.id },
      data: {
        profileImage: profileImageUrl,
        imagen: profileImageUrl, // También actualizar el campo imagen legacy
        lastAvatarChangeDate: new Date()
      }
    });

    logger.info(`✅ Foto de perfil actualizada para usuario ${user.id}`);

    return NextResponse.json({
      success: true,
      url: profileImageUrl,
      message: 'Foto de perfil actualizada correctamente'
    });

  } catch (error: any) {
    logger.error('❌ Error en POST /api/profile/upload-photo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al subir foto' },
      { status: 500 }
    );
  }
}
