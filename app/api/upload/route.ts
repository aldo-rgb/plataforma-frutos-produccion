import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Función para obtener cliente de Supabase (lazy initialization)
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'application/pdf' // Agregar soporte para PDFs
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de archivo no permitido. Solo imágenes y PDFs.' },
        { status: 400 }
      );
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'El archivo no debe superar los 5MB' },
        { status: 400 }
      );
    }

    // Convertir archivo a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Crear nombre único para el archivo
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const filename = `${timestamp}-${randomString}.${extension}`;
    const filePath = `${folder}/${filename}`;

    // Subir a Supabase Storage
    const supabase = getSupabaseClient();
    
    const { data, error: uploadError } = await supabase.storage
      .from('mentor-assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error subiendo a Supabase:', uploadError);
      return NextResponse.json(
        { success: false, error: `Error al subir el archivo: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('mentor-assets')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      filename,
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: 'Error al subir el archivo' },
      { status: 500 }
    );
  }
}
