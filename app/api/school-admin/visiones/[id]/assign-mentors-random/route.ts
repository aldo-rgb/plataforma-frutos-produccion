import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const visionId = parseInt(id);
    const schoolAdminId = session.user.id;

    // Obtener organización del director
    const user = await prisma.usuario.findUnique({
      where: { id: schoolAdminId },
      select: { organizationId: true }
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Usuario sin organización' },
        { status: 403 }
      );
    }

    // Verificar que la visión pertenece a la organización del director
    const vision = await prisma.vision.findFirst({
      where: {
        id: visionId,
        organizationId: user.organizationId
      }
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Obtener participantes con licencia pero sin mentor asignado
    const participantesRelations = await prisma.visionParticipante.findMany({
      where: {
        visionId: visionId,
        Participante: {
          licenseCode: { not: null },
          assignedMentorId: null
        }
      },
      include: {
        Participante: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    const gameChangersRelations = await prisma.visionGameChanger.findMany({
      where: {
        visionId: visionId,
        GameChanger: {
          licenseCode: { not: null },
          assignedMentorId: null
        }
      },
      include: {
        GameChanger: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    const allUsers = [
      ...participantesRelations.map(p => ({ ...p.Participante, type: 'PARTICIPANTE' as const })),
      ...gameChangersRelations.map(gc => ({ ...gc.GameChanger, type: 'GAMECHANGER' as const }))
    ];

    if (allUsers.length === 0) {
      return NextResponse.json({
        success: true,
        assigned: 0,
        message: 'No hay usuarios sin mentor que tengan licencia'
      });
    }

    // Función auxiliar para validar horarios de disciplina (05:00-08:00)
    const esHorarioDisciplinaValido = (startTime: string, endTime: string): boolean => {
      const startHour = parseInt(startTime.split(':')[0]);
      const endHour = parseInt(endTime.split(':')[0]);
      return startHour >= 5 && endHour <= 8;
    };

    // Obtener mentores activos de la visión con disponibilidad configurada
    const mentoresEnVision = await prisma.visionMentor.findMany({
      where: {
        visionId: visionId
      },
      include: {
        Mentor: {
          select: {
            id: true,
            nombre: true,
            email: true,
            isActive: true,
            CallAvailability: {
              where: {
                type: 'DISCIPLINE',
                isActive: true
              }
            }
          }
        }
      }
    });

    // Filtrar mentores activos con horarios de disciplina válidos
    const mentores = mentoresEnVision
      .filter(vm => 
        vm.Mentor.isActive && 
        vm.Mentor.CallAvailability.some(ca => 
          esHorarioDisciplinaValido(ca.startTime, ca.endTime)
        )
      )
      .map(vm => ({
        id: vm.Mentor.id,
        nombre: vm.Mentor.nombre,
        email: vm.Mentor.email
      }));

    if (mentores.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay mentores activos disponibles con horarios configurados en esta visión' },
        { status: 400 }
      );
    }

    // Asignar mentores aleatoriamente (round-robin)
    let assignedCount = 0;
    let mentorIndex = 0;

    for (const user of allUsers) {
      const mentor = mentores[mentorIndex % mentores.length];
      
      try {
        // Actualizar el usuario con el mentor asignado
        await prisma.usuario.update({
          where: { id: user.id },
          data: { assignedMentorId: mentor.id }
        });

        // Crear notificación para el mentor
        await prisma.notification.create({
          data: {
            userId: mentor.id,
            type: 'MENTOR_ASSIGNMENT',
            title: 'Nuevo usuario asignado',
            message: `Se te ha asignado a ${user.nombre} (${user.email}) como parte de ${vision.nombre}`,
            isRead: false
          }
        });

        // Crear notificación para el usuario
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'MENTOR_ASSIGNMENT',
            title: 'Mentor asignado',
            message: `${mentor.nombre} ha sido reasignado como tu mentor para ${vision.nombre}`,
            isRead: false
          }
        });

        assignedCount++;
        mentorIndex++;
      } catch (error) {
        console.error(`Error asignando mentor a usuario ${user.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      assigned: assignedCount,
      total: allUsers.length,
      mentorsUsed: mentores.length
    });

  } catch (error) {
    console.error('Error en asignación aleatoria:', error);
    return NextResponse.json(
      { success: false, error: 'Error al asignar mentores' },
      { status: 500 }
    );
  }
}
