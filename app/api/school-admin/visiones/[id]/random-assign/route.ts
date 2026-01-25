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

    if (!session?.user || session.user.rol !== 'SCHOOL_ADMIN') {
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

    // Verificar que la visión pertenece a la organización del director
    const director = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!director?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes organización asignada' },
        { status: 400 }
      );
    }

    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
    });

    if (!vision || vision.organizationId !== director.organizationId) {
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
        Usuario_VisionMentor_mentorIdToUsuario: {
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
      (vm) => vm.Usuario_VisionMentor_mentorIdToUsuario.CallAvailability && vm.Usuario_VisionMentor_mentorIdToUsuario.CallAvailability.length > 0
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

    // Obtener paquetes contratados para cada mentor en esta visión
    const mentorIds = mentoresConHorarios.map(m => m.mentorId);
    const paquetesContratados = await prisma.mentorPackageOrder.findMany({
      where: {
        visionId,
        mentorId: { in: mentorIds },
        status: 'COMPLETED'
      },
      select: {
        mentorId: true,
        cantidad: true
      }
    });

    // Crear mapa de límites por mentor (cantidad de paquetes = slots disponibles)
    const limitesPorMentor = new Map<number, number>();
    paquetesContratados.forEach(p => {
      const actual = limitesPorMentor.get(p.mentorId) || 0;
      limitesPorMentor.set(p.mentorId, actual + p.cantidad);
    });

    // Contar usuarios ya asignados a cada mentor en esta visión
    const asignacionesActuales = await prisma.vision_enrollments.findMany({
      where: {
        visionId,
        level: 'PL',
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE', 'COMPLETED'] }
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: { id: true, assignedMentorId: true }
        }
      }
    });

    const conteoActualPorMentor = new Map<number, number>();
    asignacionesActuales.forEach(e => {
      const mentorId = e.Usuario_vision_enrollments_userIdToUsuario.assignedMentorId;
      if (mentorId) {
        conteoActualPorMentor.set(mentorId, (conteoActualPorMentor.get(mentorId) || 0) + 1);
      }
    });

    // Crear estructura de mentores con disponibilidad
    const mentoresDisponiblesConLimite = mentoresConHorarios.map(m => {
      const limite = limitesPorMentor.get(m.mentorId);
      const asignados = conteoActualPorMentor.get(m.mentorId) || 0;
      const esLider = m.Usuario_VisionMentor_mentorIdToUsuario.rol === 'LIDER';
      
      return {
        mentorId: m.mentorId,
        nombre: m.Usuario_VisionMentor_mentorIdToUsuario.nombre || 'Mentor',
        esLider,
        limite: esLider ? Infinity : (limite ?? 0), // Líderes sin límite, mentores profesionales según paquetes
        asignados,
        disponibles: esLider ? Infinity : Math.max(0, (limite ?? 0) - asignados)
      };
    });

    console.log('[random-assign] Disponibilidad de mentores:', mentoresDisponiblesConLimite);

    // Obtener Game Changers de la visión
    const gameChangersDisponibles = await prisma.visionGameChanger.findMany({
      where: { visionId },
      select: { gameChangerId: true },
    });

    const gameChangerIds = gameChangersDisponibles.map((gc) => gc.gameChangerId);

    // Obtener participantes PL sin mentor asignado
    const enrollments = await prisma.vision_enrollments.findMany({
      where: { 
        visionId,
        level: 'PL',
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE', 'COMPLETED'] }
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            assignedMentorId: true,
          },
        },
      },
    });

    // También obtener VisionParticipante para asignar gameChangers
    const visionParticipantes = await prisma.visionParticipante.findMany({
      where: { visionId },
      select: { participanteId: true, gameChangerId: true },
    });
    
    // Crear un map para acceso rápido
    const vpMap = new Map(visionParticipantes.map(vp => [vp.participanteId, vp]));

    let mentorAssignments = 0;
    let gameChangerAssignments = 0;
    const errors: string[] = [];
    const skippedByLimit: string[] = [];

    console.log(`[random-assign] Vision ${visionId}: ${enrollments.length} PL enrollments, ${mentoresConHorarios.length} mentores, ${gameChangerIds.length} GCs`);

    // Función para obtener mentor con disponibilidad (round-robin respetando límites)
    const getNextAvailableMentor = () => {
      // Primero intentar con mentores que tengan disponibilidad
      const disponibles = mentoresDisponiblesConLimite.filter(m => m.disponibles > 0);
      
      if (disponibles.length === 0) {
        return null; // No hay mentores disponibles
      }
      
      // Elegir el que tenga menos asignados (balanceo)
      disponibles.sort((a, b) => a.asignados - b.asignados);
      return disponibles[0];
    };

    // Función para obtener game changer aleatorio
    const getRandomGameChanger = () => {
      if (gameChangerIds.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * gameChangerIds.length);
      return gameChangerIds[randomIndex];
    };

    // Asignar mentores y game changers aleatoriamente
    for (const enrollment of enrollments) {
      const userData = enrollment.Usuario_vision_enrollments_userIdToUsuario;
      const vpData = vpMap.get(userData.id); // Buscar en VisionParticipante si existe
      
      try {
        // Asignar mentor si no tiene
        if (!userData.assignedMentorId) {
          const mentorDisponible = getNextAvailableMentor();
          
          if (mentorDisponible) {
            await prisma.usuario.update({
              where: { id: userData.id },
              data: { assignedMentorId: mentorDisponible.mentorId },
            });

            // Actualizar contadores
            mentorDisponible.asignados++;
            mentorDisponible.disponibles = mentorDisponible.esLider ? Infinity : Math.max(0, mentorDisponible.limite - mentorDisponible.asignados);
            
            mentorAssignments++;
          } else {
            skippedByLimit.push(`${userData.nombre}: No hay mentores con paquetes disponibles`);
          }
        }

        // Asignar game changer si no tiene y hay disponibles
        // Si existe en VisionParticipante, actualizar ahí
        if (vpData && !vpData.gameChangerId && gameChangerIds.length > 0) {
          const gameChangerId = getRandomGameChanger();
          
          if (gameChangerId) {
            await prisma.visionParticipante.updateMany({
              where: {
                visionId,
                participanteId: userData.id,
              },
              data: {
                gameChangerId,
              },
            });

            gameChangerAssignments++;
          }
        }
      } catch (error: any) {
        console.error(`Error asignando a ${userData.nombre}:`, error);
        errors.push(`${userData.nombre}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Asignación completada: ${mentorAssignments} mentores y ${gameChangerAssignments} game changers asignados${skippedByLimit.length > 0 ? `. ${skippedByLimit.length} usuario(s) no asignados por límite de paquetes.` : ''}`,
      details: {
        mentorAssignments,
        gameChangerAssignments,
        totalParticipantes: enrollments.length,
        mentoresDisponibles: mentoresConHorarios.length,
        gameChangersDisponibles: gameChangerIds.length,
        mentoresLimites: mentoresDisponiblesConLimite.map(m => ({
          nombre: m.nombre,
          limite: m.limite === Infinity ? 'Sin límite (Líder)' : m.limite,
          asignados: m.asignados
        })),
        skippedByLimit: skippedByLimit.length > 0 ? skippedByLimit : undefined,
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
