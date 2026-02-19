// API para subir audio de cápsulas a Supabase Storage
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET_NAME = 'capsule-messages';

// POST - Subir audio directamente
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const campaignSlug = formData.get('campaignSlug') as string;
    const recipientId = formData.get('recipientId') as string;

    if (!file || !campaignSlug || !recipientId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Validar tipo de contenido
    const allowedTypes = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 });
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const extension = file.type.split('/')[1] || 'webm';
    const filePath = `${campaignSlug}/${recipientId}/${timestamp}.${extension}`;

    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Error uploading to Supabase:', error);
      
      // Si el bucket no existe, intentar crearlo
      if (error.message?.includes('not found')) {
        await supabase.storage.createBucket(BUCKET_NAME, {
          public: false,
          allowedMimeTypes: ['audio/*'],
          fileSizeLimit: 10485760 // 10MB
        });
        
        // Reintentar upload
        const { data: retryData, error: retryError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: false
          });
          
        if (retryError) {
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    // Obtener URL pública (o signed URL si es privado)
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

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
