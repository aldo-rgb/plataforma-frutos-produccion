import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

// OpenAI se inicializa solo si hay API key
let openai: any = null;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export const dynamic = 'force-dynamic';

/**
 * POST /api/quantum/transcribe
 * Transcribe audio a texto usando Whisper
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting - Whisper API es costosa
    const { response } = rateLimit(req, RateLimitPresets.ai);
    if (response) {
      logger.warn('Rate limit exceeded on quantum/transcribe');
      return response;
    }

    if (!openai) {
      return NextResponse.json({ error: 'Servicio de IA no configurado' }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No se proporcionó archivo de audio' }, { status: 400 });
    }

    logger.debug('🎙️ Transcribiendo audio:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    });

    // Convertir File a formato que OpenAI acepta
    const buffer = await audioFile.arrayBuffer();
    const file = new File([buffer], audioFile.name, { type: audioFile.type });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'es', // Optimizar para español
      response_format: 'json'
    });

    logger.debug('✅ Transcripción exitosa:', transcription.text);

    return NextResponse.json({
      success: true,
      text: transcription.text
    });

  } catch (error) {
    logger.error('❌ Error transcribiendo audio:', error);
    return NextResponse.json(
      { error: 'Error al transcribir audio' },
      { status: 500 }
    );
  }
}
