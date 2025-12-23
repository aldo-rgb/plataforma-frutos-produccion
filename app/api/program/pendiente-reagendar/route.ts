import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/program/pendiente-reagendar
 * Obtiene programas activos del usuario que no tienen sesiones futuras
 * (indicando que necesitan re-agendar después de cambio de mentor)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Buscar programas ACTIVOS del usuario
    const programas: any[] = await (prisma as any).programEnrollment.findMany({
      where: {
        userId: session.user.id,
        status: 'ACTIVE'
      },
      include: {
        Usuario_ProgramEnrollment_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            profileImage: true,
            imagen: true
          }
        },
        CallBookings: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            attendanceStatus: true
          }
        }
      }
    });

    const ahora = new Date();
    const programasPendientes = [];

    for (const programa of programas) {
      // Contar sesiones completadas
      const sesionesCompletadas = programa.CallBookings.filter((call: any) => 
        call.attendanceStatus === 'PRESENT' || call.status === 'COMPLETED'
      ).length;

      // Contar sesiones futuras
      const sesionesFuturas = programa.CallBookings.filter((call: any) => 
        new Date(call.scheduledAt) > ahora &&
        (call.status === 'PENDING' || call.status === 'CONFIRMED')
      ).length;

      // Si tiene sesiones completadas pero NO tiene futuras = necesita re-agendar
      if (sesionesCompletadas > 0 && sesionesFuturas === 0) {
        const semanasCompletadas = Math.floor(sesionesCompletadas / 2);
        const semanasRestantes = programa.totalWeeks - semanasCompletadas;

        programasPendientes.push({
          id: programa.id,
          mentor: {
            id: programa.Usuario_ProgramEnrollment_mentorIdToUsuario.id,
            nombre: programa.Usuario_ProgramEnrollment_mentorIdToUsuario.nombre,
            foto: programa.Usuario_ProgramEnrollment_mentorIdToUsuario.profileImage || 
                  programa.Usuario_ProgramEnrollment_mentorIdToUsuario.imagen
          },
          totalWeeks: programa.totalWeeks,
          sesionesCompletadas,
          semanasCompletadas,
          semanasRestantes,
          fechaInicio: programa.startDate,
          fechaFin: programa.endDate
        });
      }
    }

    return NextResponse.json({
      success: true,
      programas: programasPendientes,
      requiereReagendar: programasPendientes.length > 0
    });

  } catch (error) {
    console.error('Error al obtener programas pendientes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
