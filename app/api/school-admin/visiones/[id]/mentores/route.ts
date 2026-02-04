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

    // 🎯 Obtener TODOS los mentores profesionales con rol MENTOR
    const mentoresProfesionales = await prisma.usuario.findMany({
      where: {
        rol: 'MENTOR',
        isActive: true,
        PerfilMentor: {
          isNot: null // Debe tener perfil (DRAFT o APPROVED, ambos aceptados)
        }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        imagen: true,
        profileImage: true,
        isActive: true,
        rol: true,
        accumulatedMissedCalls: true,
        PerfilMentor: {
          select: {
            id: true,
            precioDisciplina: true,
            precioBase: true,
            calificacionPromedio: true,
            totalResenas: true,
            nivel: true,
            maxDisciplineClients: true,
            profileApprovalStatus: true,
          }
        },
        CallAvailability: {
          where: {
            type: 'DISCIPLINE',
            isActive: true
          }
        }
      }
    });

    console.log('👥 Mentores profesionales (rol MENTOR) encontrados:', mentoresProfesionales.length);

    // Obtener mentores asignados a esta visión (que ya están en VisionMentor)
    const mentoresAsignados = await prisma.visionMentor.findMany({
      where: { visionId },
      include: {
        Usuario_VisionMentor_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
            profileImage: true,
            isActive: true,
            rol: true,
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

    // ⭐ IMPORTANTE: NO filtrar mentores asignados por horarios
    // Si ya están asignados (VisionMentor), deben mostrarse aunque no tengan horarios
    // Los mentores contratados del catálogo configurarán sus horarios después
    const mentoresAsignadosConInfo = mentoresAsignados.map((vm: any) => {
      const mentor = vm.Usuario_VisionMentor_mentorIdToUsuario;
      const tieneHorarios = mentor.CallAvailability && mentor.CallAvailability.length > 0;
      const tieneHorariosValidos = tieneHorarios && mentor.CallAvailability.some((ca: any) => 
        esHorarioDisciplinaValido(ca.startTime, ca.endTime)
      );

      return {
        ...vm,
        tieneHorarios,
        tieneHorariosValidos,
      };
    });

    console.log('👥 Mentores asignados a la visión:', mentoresAsignados.length);
    console.log('📦 Mentores con paquetes contratados:', mentoresAsignadosConInfo.filter((m: any) => 
      m.Usuario_VisionMentor_mentorIdToUsuario.rol === 'MENTOR'
    ).length);

    // Filtrar mentores profesionales disponibles que tengan horarios válidos (05:00-08:00)
    const mentoresProfesionalesConHorarios = mentoresProfesionales.filter((m: any) => {
      const tieneHorarios = m.CallAvailability && m.CallAvailability.length > 0;
      const tieneHorariosValidos = tieneHorarios && m.CallAvailability.some((ca: any) => 
        esHorarioDisciplinaValido(ca.startTime, ca.endTime)
      );

      return tieneHorariosValidos;
    });

    console.log('✅ Mentores profesionales con horarios válidos (05:00-08:00):', mentoresProfesionalesConHorarios.length);

    // 📊 Calcular espacios disponibles para cada mentor profesional
    const mentoresConEspacios = await Promise.all(
      mentoresProfesionalesConHorarios.map(async (mentor: any) => {
        const maxClients = mentor.PerfilMentor?.maxDisciplineClients || 10;

        // Contar clientes actuales (enrollments activos)
        const currentClientsCount = await prisma.programEnrollment.count({
          where: {
            mentorId: mentor.id,
            status: 'ACTIVE',
          },
        });

        const availableSlots = Math.max(0, maxClients - currentClientsCount);

        console.log(`📊 Mentor Profesional ${mentor.nombre}:`, {
          maxClients,
          currentClients: currentClientsCount,
          availableSlots,
          percentage: maxClients > 0 ? Math.round((currentClientsCount / maxClients) * 100) : 0,
          profileStatus: mentor.PerfilMentor?.profileApprovalStatus
        });

        return {
          ...mentor,
          availabilityInfo: {
            maxClients,
            currentClients: currentClientsCount,
            availableSlots,
            percentage: maxClients > 0 ? Math.round((currentClientsCount / maxClients) * 100) : 0,
          },
        };
      })
    );

    // 👤 Obtener mentores PRIVADOS (LIDER) de la organización
    const mentoresPrivados = await prisma.usuario.findMany({
      where: {
        organizationId: vision.organizationId,
        rol: 'LIDER',
        isActive: true
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        imagen: true,
        isActive: true,
        rol: true,
        accumulatedMissedCalls: true,
        PerfilMentor: {
          select: {
            id: true,
            precioDisciplina: true,
            precioBase: true,
            calificacionPromedio: true,
            totalResenas: true,
            nivel: true,
            maxDisciplineClients: true,
          }
        },
        CallAvailability: {
          where: {
            type: 'DISCIPLINE',
            isActive: true
          }
        }
      }
    });

    console.log('👤 Mentores PRIVADOS (LIDER) encontrados:', mentoresPrivados.length);
    mentoresPrivados.forEach(m => {
      console.log(`  - ${m.nombre} (${m.email}): ${m.CallAvailability.length} horarios DISCIPLINE`);
    });

    // Los mentores privados (LIDER) NO requieren horarios DISCIPLINE para ser asignados
    // Son mentores internos de la organización que pueden configurar horarios después
    const mentoresPrivadosConHorarios = mentoresPrivados; // No filtrar por horarios

    console.log('✅ Mentores PRIVADOS disponibles para asignar:', mentoresPrivadosConHorarios.length);

    // Calcular espacios disponibles para mentores privados
    const mentoresPrivadosConEspacios = await Promise.all(
      mentoresPrivadosConHorarios.map(async (mentor: any) => {
        const maxClients = mentor.PerfilMentor?.maxDisciplineClients || 10;
        const currentClientsCount = await prisma.programEnrollment.count({
          where: {
            mentorId: mentor.id,
            status: 'ACTIVE',
          },
        });

        const availableSlots = Math.max(0, maxClients - currentClientsCount);

        return {
          ...mentor,
          availabilityInfo: {
            maxClients,
            currentClients: currentClientsCount,
            availableSlots,
            percentage: maxClients > 0 ? Math.round((currentClientsCount / maxClients) * 100) : 0,
          },
        };
      })
    );

    // 🎯 SEPARAR: Mentores Certificados (MENTOR) vs Mentores Privados (LIDER)
    // El catálogo de "Mentores Certificados" solo debe mostrar rol MENTOR
    // Los LIDER van en su propia sección como "Mentores Privados"

    return NextResponse.json({
      mentoresAsignados: mentoresAsignadosConInfo.map((vm: any) => ({
        id: vm.id,
        mentorId: vm.mentorId,
        mentor: vm.Usuario_VisionMentor_mentorIdToUsuario,
        tieneHorarios: vm.tieneHorarios,
        tieneHorariosValidos: vm.tieneHorariosValidos,
        createdAt: vm.createdAt,
        Usuario_VisionMentor_mentorIdToUsuario: {
          ...vm.Usuario_VisionMentor_mentorIdToUsuario,
          rol: vm.Usuario_VisionMentor_mentorIdToUsuario?.rol // Incluir rol del mentor
        }
      })),
      // 🎯 mentoresDisponibles = SOLO mentores certificados (rol MENTOR)
      mentoresDisponibles: mentoresConEspacios.map(m => ({
        id: m.id,
        nombre: m.nombre,
        email: m.email,
        imagen: m.imagen,
        profileImage: m.profileImage,
        isActive: m.isActive,
        accumulatedMissedCalls: m.accumulatedMissedCalls || 0,
        PerfilMentor: m.PerfilMentor,
        tieneHorarios: m.CallAvailability && m.CallAvailability.length > 0,
        rol: m.rol,
        availabilityInfo: m.availabilityInfo,
      })),
      // 🏢 lideresDisponibles = mentores privados de la organización (rol LIDER)
      lideresDisponibles: mentoresPrivadosConEspacios.map(m => ({
        id: m.id,
        nombre: m.nombre,
        email: m.email,
        imagen: m.imagen,
        isActive: m.isActive,
        accumulatedMissedCalls: m.accumulatedMissedCalls || 0,
        PerfilMentor: m.PerfilMentor,
        tieneHorarios: m.CallAvailability && m.CallAvailability.length > 0,
        rol: m.rol,
        availabilityInfo: m.availabilityInfo,
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

    // Verificar que el mentor existe, está activo y tiene rol MENTOR o LIDER
    const mentor = await prisma.usuario.findFirst({
      where: {
        id: mentorId,
        rol: { in: ['MENTOR', 'LIDER'] },
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
        { error: 'Usuario no encontrado, no está activo o no tiene permisos de mentor' },
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
        Usuario_VisionMentor_mentorIdToUsuario: {
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
