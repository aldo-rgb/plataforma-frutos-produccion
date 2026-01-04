/**
 * POST /api/mentor/bio-interview/start
 * Inicia una nueva entrevista con Quantum Bio-Writer
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { INTERVIEW_QUESTIONS } from '@/lib/quantum-bio-writer';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Permitir acceso a cualquier usuario autenticado
    // (útil para crear perfiles antes de que la sesión se actualice)

    return NextResponse.json({
      success: true,
      currentStep: 1,
      question: INTERVIEW_QUESTIONS[1],
      context: {
        currentStep: 1,
      },
    });
    
  } catch (error) {
    console.error('Error starting bio interview:', error);
    return NextResponse.json(
      { error: 'Error al iniciar entrevista' },
      { status: 500 }
    );
  }
}
