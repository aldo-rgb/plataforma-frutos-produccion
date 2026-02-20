// API para subir audio de cápsulas a Supabase Storage
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'capsule-messages';

// Función para obtener cliente de Supabase (lazy initialization) - mismo patrón que /api/upload
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
}

// POST - Subir audio directamente
export async function POST(request: NextRequest) {
  try {
    // Verificar que Supabase está configurado
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('Supabase not configured - missing URL or Service Key');
      return NextResponse.json({ 
        error: 'Servicio de almacenamiento no configurado' 
      }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const campaignSlug = formData.get('campaignSlug') as string;
    const recipientId = formData.get('recipientId') as string;

    if (!file || !campaignSlug || !recipientId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Validar tipo de contenido - ser más permisivos
    const allowedTypes = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
    // También permitir si el tipo comienza con 'audio/'
    if (!allowedTypes.includes(file.type) && !file.type.startsWith('audio/')) {
      console.error('Invalid file type:', file.type);
      return NextResponse.json({ error: `Tipo de archivo no permitido: ${file.type}` }, { status: 400 });
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const extension = file.type.split('/')[1]?.replace('x-', '') || 'webm';
    const filePath = `${campaignSlug}/${recipientId}/${timestamp}.${extension}`;

    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('Uploading audio:', { filePath, type: file.type, size: buffer.length });

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Error uploading to Supabase:', error.message, error);
      
      // Si el bucket no existe, intentar crearlo
      if (error.message?.includes('not found') || error.message?.includes('Bucket not found')) {
        console.log('Creating bucket:', BUCKET_NAME);
        const { error: bucketError } = await supabase.storage.createBucket(BUCKET_NAME, {
          public: true, // Hacer público para facilitar acceso
          allowedMimeTypes: ['audio/*'],
          fileSizeLimit: 10485760 // 10MB
        });
        
        if (bucketError) {
          console.error('Error creating bucket:', bucketError);
        }
        
        // Reintentar upload
        const { data: retryData, error: retryError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: false
          });
          
        if (retryError) {
          console.error('Retry upload failed:', retryError);
          return NextResponse.json({ 
            error: `Error al subir: ${retryError.message}` 
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({ 
          error: `Error de almacenamiento: ${error.message}` 
        }, { status: 500 });
      }
    }

    // Obtener URL pública (o signed URL si es privado)
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    console.log('Upload successful:', publicUrl);

    return NextResponse.json({
      success: true,
      fileUrl: publicUrl,
      filePath
    });
  } catch (error) {
    console.error('Error uploading audio:', error);
    return NextResponse.json({ error: 'Error al subir audio' }, { status: 500 });
  }
}
