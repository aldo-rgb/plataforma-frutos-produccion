import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Asignación aleatoria de mentores y game changers
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'COORDINADOR') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    // Verificar que la visión pertenece a la organización del coordinador
    const coordinador = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!coordinador?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes organización asignada' },
        { status: 400 }
      );
    }

    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
    });

    if (!vision || vision.coordinadorId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a esta visión' },
        { status: 403 }
      );
    }

    // Obtener mentores de la visión con horarios configurados
    const mentoresDisponibles = await prisma.visionMentor.findMany({
      where: {
        visionId,
      },
      include: {
        Mentor: {
          include: {
            CallAvailability: {
              where: {
                type: 'DISCIPLINE',
                isActive: true,
              },
            },
          },
        },
      },
    });

    const mentoresConHorarios = mentoresDisponibles.filter(
      (vm) => vm.Mentor.CallAvailability && vm.Mentor.CallAvailability.length > 0
    );

    if (mentoresConHorarios.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No hay mentores con horarios configurados en esta visión' 
        },
        { status: 400 }
      );
    }

    // Obtener Game Changers de la visión
    const gameChangersDisponibles = await prisma.visionGameChanger.findMany({
      where: { visionId },
      select: { gameChangerId: true },
    });

    const gameChangerIds = gameChangersDisponibles.map((gc) => gc.gameChangerId);

    // Obtener participantes sin mentor o sin game changer
    const participantes = await prisma.visionParticipante.findMany({
      where: { visionId },
      include: {
        Participante: {
          select: {
            id: true,
            nombre: true,
            assignedMentorId: true,
          },
        },
      },
    });

    let mentorAssignments = 0;
    let gameChangerAssignments = 0;
    const errors: string[] = [];

    // Función para obtener mentor aleatorio
    const getRandomMentor = () => {
      const randomIndex = Math.floor(Math.random() * mentoresConHorarios.length);
      return mentoresConHorarios[randomIndex].Mentor.id;
    };

    // Función para obtener game changer aleatorio
    const getRandomGameChanger = () => {
      if (gameChangerIds.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * gameChangerIds.length);
      return gameChangerIds[randomIndex];
    };

    // Asignar mentores y game changers aleatoriamente
    for (const participante of participantes) {
      try {
        const updates: any = {};

        // Asignar mentor si no tiene
        if (!participante.Participante.assignedMentorId) {
          const mentorId = getRandomMentor();
          
          await prisma.usuario.update({
            where: { id: participante.Participante.id },
            data: { assignedMentorId: mentorId },
          });

          mentorAssignments++;
        }

        // Asignar game changer si no tiene y hay disponibles
        if (!participante.gameChangerId && gameChangerIds.length > 0) {
          const gameChangerId = getRandomGameChanger();
          
          if (gameChangerId) {
            await prisma.visionParticipante.updateMany({
              where: {
                visionId,
                participanteId: participante.Participante.id,
              },
              data: {
                gameChangerId,
              },
            });

            gameChangerAssignments++;
          }
        }
      } catch (error: any) {
        console.error(`Error asignando a ${participante.Participante.nombre}:`, error);
        errors.push(`${participante.Participante.nombre}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Asignación completada: ${mentorAssignments} mentores y ${gameChangerAssignments} game changers asignados`,
      details: {
        mentorAssignments,
        gameChangerAssignments,
        totalParticipantes: participantes.length,
        mentoresDisponibles: mentoresConHorarios.length,
        gameChangersDisponibles: gameChangerIds.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error('Error in random assignment:', error);
    return NextResponse.json(
      { success: false, error: 'Error en la asignación aleatoria' },
      { status: 500 }
    );
  }
}
