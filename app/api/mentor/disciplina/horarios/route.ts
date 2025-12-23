import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mentor/disciplina/horarios
 * Obtiene las horas bloqueadas por llamadas de disciplina para un día específico
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que sea mentor
    if (session.user.rol !== 'MENTOR') {
      return NextResponse.json(
        { error: 'Solo los mentores pueden acceder a esta información' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const dia = parseInt(searchParams.get('dia') || '1');

    // Obtener los horarios de disciplina activos del mentor para ese día
    const horariosDisciplina = await prisma.callAvailability.findMany({
      where: {
        mentorId: session.user.id,
        dayOfWeek: dia,
        type: 'DISCIPLINE',
        isActive: true
      },
      select: {
        startTime: true,
        endTime: true
      }
    });

    // Convertir los bloques de tiempo en horas individuales
    const horasBloqueadas: string[] = [];
    
    horariosDisciplina.forEach(bloque => {
      const horaInicio = parseInt(bloque.startTime.split(':')[0]);
      const horaFin = parseInt(bloque.endTime.split(':')[0]);
      
      for (let h = horaInicio; h < horaFin; h++) {
        const horaStr = `${String(h).padStart(2, '0')}:00`;
        if (!horasBloqueadas.includes(horaStr)) {
          horasBloqueadas.push(horaStr);
        }
      }
    });

    return NextResponse.json({
      success: true,
      dia,
      horarios: horasBloqueadas.sort(),
      bloques: horariosDisciplina
    });

  } catch (error: any) {
    console.error('❌ Error al obtener horarios de disciplina:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener horarios de disciplina',
        details: error.message
      },
      { status: 500 }
    );
  }
}
