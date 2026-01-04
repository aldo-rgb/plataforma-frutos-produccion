import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lobo-solitario/verificar-faltas-mentor
 * Verifica cuántas faltas tiene el mentor en el ciclo actual del usuario de Lobo Solitario
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que tenga paquete de Lobo Solitario activo
    const packageCredits = await prisma.packageSessionCredits.findFirst({
      where: {
        MentorPackageOrder: {
          usuarioId: session.user.id,
          status: 'COMPLETED'
        },
        remainingSessions: {
          gt: 0
        },
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        MentorPackageOrder: {
          select: {
            id: true,
            mentorId: true,
            createdAt: true,
            Mentor: {
              select: {
                id: true,
                nombre: true,
                profileImage: true
              }
            }
          }
        }
      }
    });

    if (!packageCredits) {
      return NextResponse.json({ 
        error: 'No tienes un paquete de Lobo Solitario activo' 
      }, { status: 404 });
    }

    const mentorId = packageCredits.MentorPackageOrder.mentorId;
    const packageOrderId = packageCredits.MentorPackageOrder.id.toString();

    // Contar reportes de ausencia del mentor en este ciclo (CONFIRMADOS o PENDING)
    // Solo contar reportes del paquete actual
    const mentorAbsences = await prisma.mentorAbsenceReport.findMany({
      where: {
        studentId: session.user.id,
        mentorId: mentorId,
        status: {
          in: ['CONFIRMED', 'PENDING']
        },
        // Reportes desde que inició este paquete
        reportedAt: {
          gte: packageCredits.MentorPackageOrder.createdAt
        }
      },
      orderBy: {
        reportedAt: 'desc'
      }
    });

    const totalFaltas = mentorAbsences.length;
    const puedesCambiarMentor = totalFaltas >= 2;

    return NextResponse.json({
      success: true,
      mentor: packageCredits.MentorPackageOrder.Mentor,
      totalFaltas,
      puedesCambiarMentor,
      reportes: mentorAbsences.map(r => ({
        id: r.id,
        scheduledTime: r.scheduledTime,
        reportedAt: r.reportedAt,
        reason: r.reason,
        status: r.status
      }))
    });

  } catch (error) {
    console.error('❌ Error verificando faltas del mentor:', error);
    return NextResponse.json({ 
      error: 'Error al verificar faltas del mentor' 
    }, { status: 500 });
  }
}
