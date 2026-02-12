// API para subir audio de cápsulas a S3
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'impacto-cuantico-assets';

// POST - Obtener URL pre-firmada para subir audio
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignSlug, recipientId, fileName, contentType } = body;

    if (!campaignSlug || !recipientId || !fileName) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Validar tipo de contenido
    const allowedTypes = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 });
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `capsule-messages/${campaignSlug}/${recipientId}/${timestamp}-${safeFileName}`;

    // Crear comando para subir
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ACL: 'private', // Los audios son privados hasta que se liberen
      Metadata: {
        'campaign-slug': campaignSlug,
        'recipient-id': String(recipientId),
        'upload-date': new Date().toISOString()
      }
    });

    // Generar URL pre-firmada (válida por 5 minutos)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // URL final del archivo (para guardar en DB)
    const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      key,
      expiresIn: 300
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json({ error: 'Error al generar URL de subida' }, { status: 500 });
  }
}
