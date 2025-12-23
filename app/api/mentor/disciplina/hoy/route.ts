import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const mentor = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!mentor || mentor.rol !== 'MENTOR') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener llamadas de disciplina del día de hoy
    const hoy = new Date();
    const inicioDelDia = startOfDay(hoy);
    const finDelDia = endOfDay(hoy);

    const llamadas: any[] = await prisma.callBooking.findMany({
      where: {
        mentorId: mentor.id,
        type: 'DISCIPLINE',
        scheduledAt: {
          gte: inicioDelDia,
          lte: finDelDia
        },
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      include: {
        Usuario_CallBooking_studentIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            imagen: true,
            profileImage: true
          }
        },
        ProgramEnrollment: {
          select: {
            missedCallsCount: true,
            maxMissedAllowed: true,
            status: true
          }
        }
      } as any,
      orderBy: {
        scheduledAt: 'asc'
      }
    });

    // Formatear datos para el widget
    const llamadasFormateadas = llamadas.map((llamada: any) => {
      const student = llamada.Usuario_CallBooking_studentIdToUsuario;
      const program = llamada.ProgramEnrollment;
      
      return {
        id: llamada.id,
        alumno: student.nombre,
        hora: new Date(llamada.scheduledAt).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        foto: student.profileImage || student.imagen,
        strikes: program?.missedCallsCount || 0,
        maxStrikes: program?.maxMissedAllowed || 3,
        status: llamada.attendanceStatus || 'PENDING',
        weekNumber: llamada.weekNumber || 0
      };
    });

    return NextResponse.json({
      success: true,
      llamadas: llamadasFormateadas
    });

  } catch (error) {
    console.error('Error obteniendo llamadas de disciplina:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
