import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      perfilMentorId,
      servicioId,
      fechaSolicitada,
      horaSolicitada,
      notas,
    } = body;

    // 🛡️ VALIDACIÓN 1: Campos requeridos (Anti-Solicitudes Incompletas)
    if (!perfilMentorId || !servicioId) {
      return NextResponse.json(
        { error: 'Datos incompletos: Debes seleccionar un servicio' },
        { status: 400 }
      );
    }

    // 🛡️ VALIDACIÓN 2: Fecha y Hora obligatorias (Prevenir "Por confirmar" sin hora)
    if (!fechaSolicitada || !horaSolicitada) {
      return NextResponse.json(
        { 
          error: 'Debes seleccionar una fecha y hora específica para tu sesión',
          code: 'MISSING_DATETIME'
        },
        { status: 400 }
      );
    }

    // Validar formato de fecha y hora
    const fechaDate = new Date(fechaSolicitada);
    if (isNaN(fechaDate.getTime())) {
      return NextResponse.json(
        { error: 'Fecha inválida' },
        { status: 400 }
      );
    }

    // Validar que la fecha no sea en el pasado
    const ahora = new Date();
    if (fechaDate < ahora) {
      return NextResponse.json(
        { error: 'No puedes agendar sesiones en el pasado' },
        { status: 400 }
      );
    }

    // Obtener datos del servicio y mentor
    const servicio = await prisma.servicioMentoria.findUnique({
      where: { id: servicioId },
      include: {
        PerfilMentor: true,
      },
    });

    if (!servicio || !servicio.activo) {
      return NextResponse.json(
        { error: 'Servicio no disponible' },
        { status: 404 }
      );
    }

    // 🛡️ VALIDACIÓN 3: Anti-Double-Booking del Mentor
    // Verificar que el horario solicitado no esté ya ocupado con otro estudiante
    const conflictoMentor = await prisma.solicitudMentoria.findFirst({
      where: {
        perfilMentorId,
        fechaSolicitada: fechaDate,
        horaSolicitada,
        estado: {
          in: ['PENDIENTE', 'CONFIRMADA']
        }
      },
      include: {
        Usuario: {
          select: { nombre: true }
        }
      }
    });

    if (conflictoMentor) {
      return NextResponse.json(
        { 
          error: 'Este horario ya no está disponible. Otro estudiante lo reservó primero.',
          code: 'MENTOR_SLOT_TAKEN',
          suggestion: 'Por favor selecciona otro horario'
        },
        { status: 409 } // 409 Conflict
      );
    }

    // 🛡️ VALIDACIÓN 4: Anti-Ubiquidad del Estudiante
    // Un estudiante no puede estar en dos mentorías al mismo tiempo
    const conflictoEstudiante = await prisma.solicitudMentoria.findFirst({
      where: {
        clienteId: session.user.id,
        fechaSolicitada: fechaDate,
        horaSolicitada,
        estado: {
          in: ['PENDIENTE', 'CONFIRMADA']
        }
      },
      include: {
        PerfilMentor: {
          include: {
            Usuario: {
              select: { nombre: true }
            }
          }
        }
      }
    });

    if (conflictoEstudiante) {
      const mentorConflicto = conflictoEstudiante.PerfilMentor.Usuario.nombre;
      return NextResponse.json(
        { 
          error: `Ya tienes una sesión programada a esta hora con ${mentorConflicto}.`,
          code: 'STUDENT_TIME_CONFLICT',
          suggestion: 'Por favor elige otro horario o cancela tu sesión anterior'
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Calcular desglose de pago
    const montoTotal = servicio.precioTotal;
    const comisionPlataforma = servicio.PerfilMentor.comisionPlataforma;
    const comisionMentor = servicio.PerfilMentor.comisionMentor;

    const montoPagadoPlataforma = (montoTotal * comisionPlataforma) / 100;
    const montoPagadoMentor = (montoTotal * comisionMentor) / 100;

    // Crear transacción
    const transaccion = await prisma.transaccion.create({
      data: {
        usuarioId: session.user.id,
        montoDinero: montoTotal,
        metodo: 'STRIPE', // Por defecto, se puede cambiar según implementación
        estado: 'PENDIENTE',
      },
    });

    // Crear solicitud de mentoría
    const solicitud = await prisma.solicitudMentoria.create({
      data: {
        clienteId: session.user.id,
        perfilMentorId,
        servicioId,
        fechaSolicitada: fechaSolicitada ? new Date(fechaSolicitada) : null,
        horaSolicitada,
        montoTotal,
        montoPagadoMentor,
        montoPagadoPlataforma,
        transaccionId: transaccion.id,
        notas,
        estado: 'PENDIENTE',
      },
      include: {
        PerfilMentor: {
          include: {
            Usuario: {
              select: {
                nombre: true,
                email: true,
              },
            },
          },
        },
        ServicioMentoria: true,
      },
    });

    console.log(`✅ Solicitud de mentoría creada:
      - Cliente: ${session.user.email}
      - Mentor: ${solicitud.PerfilMentor.Usuario.nombre}
      - Servicio: ${solicitud.ServicioMentoria.nombre}
      - Total: $${montoTotal}
      - Plataforma: $${montoPagadoPlataforma} (${comisionPlataforma}%)
      - Mentor: $${montoPagadoMentor} (${comisionMentor}%)
    `);

    return NextResponse.json({
      success: true,
      solicitud: {
        id: solicitud.id,
        estado: solicitud.estado,
        montoTotal: solicitud.montoTotal,
        transaccionId: transaccion.id,
        mentor: solicitud.PerfilMentor.Usuario.nombre,
        servicio: solicitud.ServicioMentoria.nombre,
      },
    });

  } catch (error) {
    console.error('❌ Error al crear solicitud de mentoría:', error);
    return NextResponse.json(
      { error: 'Error al procesar solicitud' },
      { status: 500 }
    );
  }
}

// GET - Obtener solicitudes del cliente
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const solicitudes = await prisma.solicitudMentoria.findMany({
      where: {
        clienteId: session.user.id,
      },
      include: {
        PerfilMentor: {
          include: {
            Usuario: {
              select: {
                nombre: true,
                imagen: true,
              },
            },
          },
        },
        ServicioMentoria: true,
        Transaccion: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const solicitudesFormateadas = solicitudes.map((s: typeof solicitudes[number]) => ({
      id: s.id,
      mentor: {
        nombre: s.PerfilMentor.Usuario.nombre,
        imagen: s.PerfilMentor.Usuario.imagen,
        especialidad: s.PerfilMentor.especialidad,
      },
      servicio: {
        nombre: s.ServicioMentoria.nombre,
        duracion: s.ServicioMentoria.duracionHoras,
      },
      estado: s.estado,
      fechaSolicitada: s.fechaSolicitada,
      horaSolicitada: s.horaSolicitada,
      montoTotal: s.montoTotal,
      estadoPago: s.Transaccion?.estado || 'PENDIENTE',
      createdAt: s.createdAt,
    }));

    return NextResponse.json({
      solicitudes: solicitudesFormateadas,
      total: solicitudesFormateadas.length,
    });

  } catch (error) {
    console.error('❌ Error al obtener solicitudes:', error);
    return NextResponse.json(
      { error: 'Error al cargar solicitudes' },
      { status: 500 }
    );
  }
}
