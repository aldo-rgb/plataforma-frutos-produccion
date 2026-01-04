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

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener coordinador por email
    const coordinador = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true,
        rol: true,
        organizationId: true 
      },
    });

    if (!coordinador || coordinador.rol !== 'COORDINADOR') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
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

    if (!coordinador.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes organización asignada' },
        { status: 400 }
      );
    }

    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
    });

    if (!vision || vision.coordinadorId !== coordinador.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a esta visión' },
        { status: 403 }
      );
    }

    // Obtener mentores disponibles (rol MENTOR o LIDER) de la organización
    const mentoresDisponibles = await prisma.usuario.findMany({
      where: {
        organizationId: coordinador.organizationId,
        rol: {
          in: ['MENTOR', 'LIDER']
        },
        isActive: true,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
      },
    });

    if (mentoresDisponibles.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No hay mentores o líderes disponibles en la organización' 
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

    // Obtener participantes
    const participantes = await prisma.visionParticipante.findMany({
      where: { visionId },
      include: {
        Usuario_VisionParticipante_participanteIdToUsuario: {
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
      const randomIndex = Math.floor(Math.random() * mentoresDisponibles.length);
      return mentoresDisponibles[randomIndex].id;
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
        const usuario = participante.Usuario_VisionParticipante_participanteIdToUsuario;

        // Asignar mentor si no tiene
        if (!usuario.assignedMentorId) {
          const mentorId = getRandomMentor();
          
          await prisma.usuario.update({
            where: { id: usuario.id },
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
                participanteId: usuario.id,
              },
              data: {
                gameChangerId,
              },
            });

            gameChangerAssignments++;
          }
        }
      } catch (error: any) {
        const usuario = participante.Usuario_VisionParticipante_participanteIdToUsuario;
        console.error(`Error asignando a ${usuario.nombre}:`, error);
        errors.push(`${usuario.nombre}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Asignación completada: ${mentorAssignments} mentores y ${gameChangerAssignments} game changers asignados`,
      details: {
        mentorAssignments,
        gameChangerAssignments,
        totalParticipantes: participantes.length,
        mentoresDisponibles: mentoresDisponibles.length,
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
