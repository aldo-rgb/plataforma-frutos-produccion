/**
 * POST /api/mentor/bio-interview/answer
 * Procesa la respuesta del mentor y devuelve siguiente pregunta o resultado final
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processInterviewStep, type InterviewContext } from '@/lib/quantum-bio-writer';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Permitir acceso a cualquier usuario autenticado

    const { context, answer } = await request.json();
    
    if (!context || !answer) {
      return NextResponse.json(
        { error: 'Contexto y respuesta son requeridos' },
        { status: 400 }
      );
    }

    const interviewContext: InterviewContext = context;
    
    // Procesar siguiente paso
    const result = await processInterviewStep(interviewContext, answer);
    
    if (result.isComplete && result.result) {
      // Guardar en la base de datos usando upsert (crear o actualizar)
      await prisma.perfilMentor.upsert({
        where: { usuarioId: session.user.id },
        create: {
          usuarioId: session.user.id,
          especialidad: result.result.expertiseTags[0] || 'Mentoría General', // Campo requerido
          heroJourneyBio: result.result.heroJourneyBio,
          promiseStatement: result.result.promiseStatement,
          tagline: result.result.tagline,
          methodologyStyle: result.result.detectedStyle,
          expertiseTags: result.result.expertiseTags,
          aiGeneratedBio: true,
          lastAiInterviewAt: new Date(),
          biografiaCompleta: result.result.heroJourneyBio,
          biografia: result.result.promiseStatement,
        },
        update: {
          heroJourneyBio: result.result.heroJourneyBio,
          promiseStatement: result.result.promiseStatement,
          tagline: result.result.tagline,
          methodologyStyle: result.result.detectedStyle,
          expertiseTags: result.result.expertiseTags,
          aiGeneratedBio: true,
          lastAiInterviewAt: new Date(),
          biografiaCompleta: result.result.heroJourneyBio,
          biografia: result.result.promiseStatement,
        },
      });

      return NextResponse.json({
        success: true,
        isComplete: true,
        result: result.result,
      });
    }
    
    return NextResponse.json({
      success: true,
      isComplete: false,
      nextQuestion: result.nextQuestion,
      context: interviewContext,
    });
    
  } catch (error) {
    console.error('Error processing interview answer:', error);
    return NextResponse.json(
      { error: 'Error al procesar respuesta' },
      { status: 500 }
    );
  }
}
