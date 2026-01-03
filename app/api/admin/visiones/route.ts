import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Listar todas las visiones
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { rol: true }
    });

    if (usuario?.rol !== 'COORDINADOR' && usuario?.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Sistema de Visiones con jerarquía implementado
    const visiones = await prisma.vision.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        VisionGameChanger: {
          include: {
            Usuario_VisionGameChanger_gameChangerIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                email: true
              }
            }
          }
        },
        VisionParticipante: {
          include: {
            Usuario_VisionParticipante_participanteIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                email: true
              }
            },
            Usuario_VisionParticipante_gameChangerIdToUsuario: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        _count: {
          select: { 
            VisionGameChanger: true,
            VisionParticipante: true
          }
        }
      }
    });

    return NextResponse.json({ visiones });

  } catch (error) {
    console.error('Error loading visiones:', error);
    return NextResponse.json({ error: 'Error al cargar visiones' }, { status: 500 });
  }
}

// POST - Crear nueva visión
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (usuario?.rol !== 'COORDINADOR' && usuario?.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, startDate, endDate, usuarioIds } = body;

    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Las fechas son requeridas' }, { status: 400 });
    }

    if (!usuarioIds || usuarioIds.length === 0) {
      return NextResponse.json({ error: 'Debes seleccionar al menos un usuario' }, { status: 400 });
    }

    // Validar fechas
    const fechaInicio = new Date(startDate);
    const fechaFin = new Date(endDate);
    
    if (fechaFin <= fechaInicio) {
      return NextResponse.json({ error: 'La fecha fin debe ser posterior a la fecha inicio' }, { status: 400 });
    }

    // Crear visión con el coordinador que la crea
    const nuevaVision = await prisma.vision.create({
      data: {
        nombre: name,
        descripcion: description || null,
        coordinadorId: usuario.id,
        startDate: fechaInicio,
        endDate: fechaFin,
        isActive: true
      }
    });

    // Crear ciclos VISION para cada usuario seleccionado
    const ciclosCreados = [];
    for (const userId of usuarioIds) {
      // Verificar que el usuario no tenga ciclo activo
      const cicloExistente = await prisma.programEnrollment.findFirst({
        where: {
          userId: userId,
          status: 'ACTIVE'
        }
      });

      if (!cicloExistente) {
        // Calcular duración en semanas (aproximado)
        const duracionMs = fechaFin.getTime() - fechaInicio.getTime();
        const duracionSemanas = Math.ceil(duracionMs / (7 * 24 * 60 * 60 * 1000));

        const ciclo = await prisma.programEnrollment.create({
          data: {
            userId: userId,
            mentorId: userId, // Por ahora el mentor es el mismo usuario
            visionId: nuevaVision.id,
            cycleType: 'VISION',
            cycleStartDate: fechaInicio,
            cycleEndDate: fechaFin,
            totalWeeks: duracionSemanas,
            status: 'ACTIVE'
          }
        });
        ciclosCreados.push(ciclo);
      }
    }

    return NextResponse.json({ 
      success: true, 
      vision: nuevaVision,
      ciclosCreados: ciclosCreados.length,
      message: `Visión creada con ${ciclosCreados.length} ciclos iniciados`
    });

  } catch (error) {
    console.error('Error creating vision:', error);
    return NextResponse.json({ error: 'Error al crear visión' }, { status: 500 });
  }
}
