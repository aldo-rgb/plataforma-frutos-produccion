import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// OpenAI se inicializa solo si hay API key
let openai: any = null;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export const dynamic = 'force-dynamic';

/**
 * POST /api/quantum/speak
 * Convierte texto a audio usando TTS de OpenAI
 */
export async function POST(req: Request) {
  try {
    if (!openai) {
      return NextResponse.json({ error: 'Servicio de IA no configurado' }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'No se proporcionó texto' }, { status: 400 });
    }

    console.log('🗣️ Generando audio para texto:', text.substring(0, 100) + '...');

    // Generar audio con voz autoritaria y profesional
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1', // Baja latencia
      voice: 'onyx', // Voz profunda y autoritaria
      input: text,
      speed: 1.0 // Velocidad normal
    });

    // Convertir a buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    console.log('✅ Audio generado:', buffer.length, 'bytes');

    // Retornar audio como stream
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      }
    });

  } catch (error) {
    console.error('❌ Error generando audio:', error);
    return NextResponse.json(
      { error: 'Error al generar audio' },
      { status: 500 }
    );
  }
}
