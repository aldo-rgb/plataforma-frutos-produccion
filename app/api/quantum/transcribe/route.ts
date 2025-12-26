import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const dynamic = 'force-dynamic';

/**
 * POST /api/quantum/transcribe
 * Transcribe audio a texto usando Whisper
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No se proporcionó archivo de audio' }, { status: 400 });
    }

    console.log('🎙️ Transcribiendo audio:', {
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

    console.log('✅ Transcripción exitosa:', transcription.text);

    return NextResponse.json({
      success: true,
      text: transcription.text
    });

  } catch (error) {
    console.error('❌ Error transcribiendo audio:', error);
    return NextResponse.json(
      { error: 'Error al transcribir audio' },
      { status: 500 }
    );
  }
}
