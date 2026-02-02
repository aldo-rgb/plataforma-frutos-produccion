import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener conteo de participantes PL (Liderato) de una visión
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');

    if (!visionId) {
      return NextResponse.json({ error: 'visionId requerido' }, { status: 400 });
    }

    const visionIdInt = parseInt(visionId);

    // Solo buscar participantes en nivel PL (Liderato en curso)
    // CON asistencia confirmada en el primer fin de semana
    const plEnrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId: visionIdInt,
        enrollmentStatus: 'ENROLLED',
        level: 'PL', // Solo nivel PL
        attendanceStatus: 'ATTENDED', // Solo con asistencia confirmada
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: { id: true, nombre: true, profileImage: true, email: true },
        },
      },
    });

    const participants = plEnrollments
      .filter(e => e.Usuario_vision_enrollments_userIdToUsuario)
      .map(e => ({
        id: e.Usuario_vision_enrollments_userIdToUsuario!.id,
        nombre: e.Usuario_vision_enrollments_userIdToUsuario!.nombre,
        profileImage: e.Usuario_vision_enrollments_userIdToUsuario!.profileImage,
        email: e.Usuario_vision_enrollments_userIdToUsuario!.email,
      }));

    return NextResponse.json({
      success: true,
      count: participants.length,
      participants,
      note: 'Solo participantes PL con asistencia confirmada en Liderato',
    });

  } catch (error) {
    console.error('Error fetching vision participants:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
