import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Función para obtener cliente de Supabase (lazy initialization)
function getSupabaseClient() {
  // En server-side, usar variables sin NEXT_PUBLIC_ prefix cuando sea posible
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('🔍 Checking Supabase env vars:');
  console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
  console.log('  Using URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  
  if (!supabaseUrl || !supabaseKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
    throw new Error(`Missing Supabase environment variables: ${missingVars.join(', ')}`);
  }
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Upload API called');
    
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.log('❌ Unauthorized: No session');
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', session.user.email);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    console.log('📁 Folder:', folder);
    console.log('📄 File:', file?.name, file?.type, file?.size);

    if (!file) {
      console.log('❌ No file provided');
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
    console.log('🔄 Uploading to Supabase:', filePath);
    
    let supabase;
    try {
      supabase = getSupabaseClient();
      console.log('✅ Supabase client created');
    } catch (error: any) {
      console.error('❌ Failed to create Supabase client:', error.message);
      return NextResponse.json(
        { success: false, error: `Error de configuración: ${error.message}` },
        { status: 500 }
      );
    }
    
    const { data, error: uploadError } = await supabase.storage
      .from('mentor-assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Error subiendo a Supabase:', uploadError);
      return NextResponse.json(
        { success: false, error: `Error al subir el archivo: ${uploadError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ File uploaded successfully to Supabase');

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('mentor-assets')
      .getPublicUrl(filePath);

    console.log('✅ Public URL generated:', urlData.publicUrl);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      filename,
    });

  } catch (error: any) {
    console.error('❌ Error uploading file:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al subir el archivo' },
      { status: 500 }
    );
  }
}
