import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'impacto-cuantico-assets';

// POST: Obtener URL pre-firmada para subir audio/track
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, type, fileName, contentType, passengerId } = body;

    // type: 'track' (tracks globales) o 'song' (canción de vuelo de pasajero)
    if (!eventId || !type || !fileName || !contentType) {
      return NextResponse.json({ 
        error: 'eventId, type, fileName y contentType son requeridos' 
      }, { status: 400 });
    }

    // Validar tipo de archivo
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/webm', 'audio/x-m4a'];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json({ 
        error: 'Tipo de archivo no permitido. Usa MP3, WAV o M4A' 
      }, { status: 400 });
    }

    // Generar path único
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    let key: string;
    if (type === 'track') {
      key = `flight-deck/events/${eventId}/tracks/${timestamp}-${sanitizedFileName}`;
    } else if (type === 'song' && passengerId) {
      key = `flight-deck/events/${eventId}/songs/${passengerId}/${timestamp}-${sanitizedFileName}`;
    } else {
      return NextResponse.json({ error: 'Tipo inválido o falta passengerId' }, { status: 400 });
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      key
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
