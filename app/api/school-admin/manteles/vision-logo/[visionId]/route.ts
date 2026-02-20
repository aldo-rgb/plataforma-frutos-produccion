// API para subir logo de visión para manteles
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'mantel-assets';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
}

// POST - Subir logo de visión
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ visionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['SCHOOL_ADMIN', 'ADMINISTRADOR', 'COORDINADOR'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { visionId } = await params;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Storage no configurado' }, { status: 500 });
    }

    // Verificar/crear bucket si no existe
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
      if (createError && !createError.message.includes('already exists')) {
        console.error('Error creating bucket:', createError);
        return NextResponse.json({ error: 'Error creando storage' }, { status: 500 });
      }
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
    }

    // Subir archivo
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `vision-logos/vision-${visionId}-${timestamp}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Error al subir archivo: ' + uploadError.message 
      }, { status: 500 });
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      logoUrl: publicUrl
    });
  } catch (error) {
    console.error('Error uploading vision logo:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
