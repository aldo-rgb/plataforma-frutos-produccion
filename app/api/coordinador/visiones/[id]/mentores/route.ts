import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Obtener mentores disponibles y asignados a la visión
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    // Obtener la visión con su organización
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      include: { Organization: true }
    });

    if (!vision) {
      return NextResponse.json(
        { error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Obtener mentores asignados a esta visión
    const mentoresAsignados = await prisma.visionMentor.findMany({
      where: { visionId },
      include: {
        Usuario_VisionMentor_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
            isActive: true,
            PerfilMentor: true,
            CallAvailability: {
              where: {
                type: 'DISCIPLINE',
                isActive: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Función auxiliar para validar si un horario está en el rango del Club de las 5 AM (05:00-08:00)
    const esHorarioDisciplinaValido = (startTime: string, endTime: string): boolean => {
      const startHour = parseInt(startTime.split(':')[0]);
      const endHour = parseInt(endTime.split(':')[0]);
      // Debe estar completamente dentro del rango 05:00-08:00
      return startHour >= 5 && endHour <= 8;
    };

    // Filtrar solo mentores asignados que tengan horarios de disciplina válidos (05:00-08:00)
    const mentoresAsignadosConHorarios = mentoresAsignados.filter((vm: any) => {
      return vm.Usuario_VisionMentor_mentorIdToUsuario.CallAvailability.some((ca: any) => 
        esHorarioDisciplinaValido(ca.startTime, ca.endTime)
      );
    });

    // Obtener solo líderes activos de la misma organización que la visión
    const mentoresDisponibles = await prisma.usuario.findMany({
      where: {
        rol: 'LIDER',
        isActive: true,
        organizationId: vision.organizationId
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        imagen: true,
        isActive: true,
        PerfilMentor: true,
        CallAvailability: {
          where: {
            type: 'DISCIPLINE',
            isActive: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    // Filtrar solo mentores con horarios de disciplina válidos en el rango 05:00-08:00
    const mentoresConHorarios = mentoresDisponibles.filter((m: any) => {
      return m.CallAvailability.some((ca: any) => 
        esHorarioDisciplinaValido(ca.startTime, ca.endTime)
      );
    });

    return NextResponse.json({
      mentoresAsignados: mentoresAsignadosConHorarios.map((vm: any) => ({
        id: vm.id,
        mentorId: vm.mentorId,
        mentor: vm.Usuario_VisionMentor_mentorIdToUsuario,
        tieneHorarios: true, // Siempre true porque ya filtramos
        createdAt: vm.createdAt
      })),
      mentoresDisponibles: mentoresConHorarios.map(m => ({
        id: m.id,
        nombre: m.nombre,
        email: m.email,
        imagen: m.imagen,
        isActive: m.isActive,
        perfilMentor: m.PerfilMentor,
        tieneHorarios: true // Siempre true porque ya filtramos
      }))
    });

  } catch (error) {
    console.error('Error al obtener mentores:', error);
    return NextResponse.json(
      { error: 'Error al obtener mentores' },
      { status: 500 }
    );
  }
}

// POST - Asignar mentor a visión
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visionId = parseInt(id);
    const body = await request.json();
    const { mentorId, asignadoPorId } = body;

    if (isNaN(visionId) || !mentorId || !asignadoPorId) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Verificar que el mentor existe, está activo y es de la organización
    const mentor = await prisma.usuario.findFirst({
      where: {
        id: mentorId,
        rol: 'MENTOR',
        isActive: true
      },
      include: {
        CallAvailability: {
          where: {
            type: 'DISCIPLINE',
            isActive: true
          }
        }
      }
    });

    if (!mentor) {
      return NextResponse.json(
        { error: 'Mentor no encontrado o no está activo' },
        { status: 404 }
      );
    }

    // Verificar que el mentor tiene horarios configurados para disciplina
    if (mentor.CallAvailability.length === 0) {
      return NextResponse.json(
        { 
          error: 'El mentor no tiene horarios de llamadas de disciplina configurados',
          requiresConfig: true
        },
        { status: 400 }
      );
    }

    // Verificar que la visión existe
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      include: { Organization: true }
    });

    if (!vision) {
      return NextResponse.json(
        { error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Los mentores son independientes y pueden ser asignados a cualquier organización

    // Verificar si ya está asignado
    const yaAsignado = await prisma.visionMentor.findUnique({
      where: {
        visionId_mentorId: {
          visionId,
          mentorId
        }
      }
    });

    if (yaAsignado) {
      return NextResponse.json(
        { error: 'El mentor ya está asignado a esta visión' },
        { status: 400 }
      );
    }

    // Crear la asignación
    const visionMentor = await prisma.visionMentor.create({
      data: {
        visionId,
        mentorId,
        asignadoPorId
      },
      include: {
        Mentor: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true
          }
        }
      }
    });

    // Actualizar mentorId en todos los participantes y game changers de esta visión que no tengan mentor
    const participantes = await prisma.visionParticipante.findMany({
      where: { visionId },
      select: { participanteId: true }
    });

    const gameChangers = await prisma.visionGameChanger.findMany({
      where: { visionId },
      select: { gameChangerId: true }
    });

    const usuariosIds = [
      ...participantes.map(p => p.participanteId),
      ...gameChangers.map(gc => gc.gameChangerId)
    ];

    if (usuariosIds.length > 0) {
      await prisma.usuario.updateMany({
        where: {
          id: { in: usuariosIds },
          mentorId: null // Solo actualizar los que no tienen mentor asignado
        },
        data: {
          mentorId: mentorId
        }
      });
    }

    return NextResponse.json({
      success: true,
      visionMentor,
      message: 'Mentor asignado exitosamente a participantes y game changers'
    });

  } catch (error) {
    console.error('Error al asignar mentor:', error);
    return NextResponse.json(
      { error: 'Error al asignar mentor' },
      { status: 500 }
    );
  }
}

// DELETE - Remover mentor de visión
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visionId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const mentorId = parseInt(searchParams.get('mentorId') || '');

    if (isNaN(visionId) || isNaN(mentorId)) {
      return NextResponse.json(
        { error: 'IDs inválidos' },
        { status: 400 }
      );
    }

    // Eliminar la asignación
    await prisma.visionMentor.delete({
      where: {
        visionId_mentorId: {
          visionId,
          mentorId
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Mentor removido exitosamente'
    });

  } catch (error) {
    console.error('Error al remover mentor:', error);
    return NextResponse.json(
      { error: 'Error al remover mentor' },
      { status: 500 }
    );
  }
}
