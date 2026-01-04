/**
 * POST /api/mentor/bio-interview/regenerate
 * Regenera la biografía con un tono diferente
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { regenerateBio, type InterviewContext } from '@/lib/quantum-bio-writer';
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

    const { context, tone } = await request.json();
    
    if (!context || !tone) {
      return NextResponse.json(
        { error: 'Contexto y tono son requeridos' },
        { status: 400 }
      );
    }

    const validTones = ['more_authoritative', 'more_empathic', 'more_inspiring'];
    if (!validTones.includes(tone)) {
      return NextResponse.json(
        { error: 'Tono inválido' },
        { status: 400 }
      );
    }

    const interviewContext: InterviewContext = context;
    
    // Regenerar bio
    const result = await regenerateBio(interviewContext, tone);
    
    // Actualizar en BD usando upsert (crear o actualizar)
    await prisma.perfilMentor.upsert({
      where: { usuarioId: session.user.id },
      create: {
        usuarioId: session.user.id,
        especialidad: result.expertiseTags[0] || 'Mentoría General', // Campo requerido
        heroJourneyBio: result.heroJourneyBio,
        promiseStatement: result.promiseStatement,
        tagline: result.tagline,
        methodologyStyle: result.detectedStyle,
        expertiseTags: result.expertiseTags,
        aiGeneratedBio: true,
        lastAiInterviewAt: new Date(),
        biografiaCompleta: result.heroJourneyBio,
        biografia: result.promiseStatement,
      },
      update: {
        heroJourneyBio: result.heroJourneyBio,
        promiseStatement: result.promiseStatement,
        tagline: result.tagline,
        methodologyStyle: result.detectedStyle,
        expertiseTags: result.expertiseTags,
        aiGeneratedBio: true,
        lastAiInterviewAt: new Date(),
        biografiaCompleta: result.heroJourneyBio,
        biografia: result.promiseStatement,
      },
    });

    return NextResponse.json({
      success: true,
      result,
    });
    
  } catch (error) {
    console.error('Error regenerating bio:', error);
    return NextResponse.json(
      { error: 'Error al regenerar biografía' },
      { status: 500 }
    );
  }
}
