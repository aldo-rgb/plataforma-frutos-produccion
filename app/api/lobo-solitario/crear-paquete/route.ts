import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/lobo-solitario/crear-paquete
 * 
 * Crea una orden de paquete para un lobo solitario (usuario sin visión)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { mentorId, plan, frecuencia, cantidadSesiones } = body;

    if (!mentorId || !plan || !frecuencia || !cantidadSesiones) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // ===== VALIDACIÓN: Verificar si ya tiene un paquete activo =====
    const existingCredits = await prisma.packageSessionCredits.findFirst({
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
            paymentData: true,
            paidAt: true,
            Usuario_MentorPackageOrder_mentorIdToUsuario: {
              select: {
                nombre: true
              }
            }
          }
        }
      }
    });

    if (existingCredits) {
      const planExistente = existingCredits.MentorPackageOrder.paymentData as any;
      const esAnual = planExistente?.frecuencia === 'ANUAL';
      
      return NextResponse.json(
        { 
          error: 'Ya tienes un paquete activo',
          details: {
            message: esAnual 
              ? 'Ya tienes un plan ANUAL activo. No puedes comprar otro paquete hasta que uses tus sesiones actuales o expire tu plan.'
              : 'Ya tienes un paquete activo. Usa tus sesiones restantes antes de comprar otro paquete.',
            remainingSessions: existingCredits.remainingSessions,
            totalSessions: existingCredits.totalSessions,
            expiresAt: existingCredits.expiresAt,
            mentor: existingCredits.MentorPackageOrder.Usuario_MentorPackageOrder_mentorIdToUsuario?.nombre,
            planType: planExistente?.plan,
            frecuencia: planExistente?.frecuencia
          }
        },
        { status: 400 }
      );
    }

    // ===== VALIDACIÓN ADICIONAL: Verificar órdenes pendientes =====
    const pendingOrder = await prisma.mentorPackageOrder.findFirst({
      where: {
        usuarioId: session.user.id,
        status: 'PENDING',
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // Últimos 30 minutos
        }
      }
    });

    if (pendingOrder) {
      return NextResponse.json(
        { 
          error: 'Ya tienes una orden de pago pendiente',
          details: {
            message: 'Completa tu pago pendiente o espera 30 minutos para crear una nueva orden.',
            ordenId: pendingOrder.id
          }
        },
        { status: 400 }
      );
    }

    // Obtener precios dinámicos desde la configuración
    const preciosRes = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/precios`);
    let precios: any = {};
    
    if (preciosRes.ok) {
      precios = await preciosRes.json();
    }

    // Calcular precio según plan y frecuencia
    let precioTotal = 0;
    let precioUnitario = 0;

    if (plan === 'STANDARD') {
      if (frecuencia === 'ANUAL') {
        precioTotal = precios.standard?.mxn?.anual || 10000;
      } else {
        precioTotal = precios.standard?.mxn?.bimestral || 2000;
      }
    } else if (plan === 'PREMIUM') {
      if (frecuencia === 'ANUAL') {
        precioTotal = precios.premium?.mxn?.anual || 25000;
      } else {
        precioTotal = precios.premium?.mxn?.bimestral || 4000;
      }
    }

    precioUnitario = Math.round(precioTotal / cantidadSesiones);

    // Verificar que el mentor existe y está disponible
    const mentor = await prisma.usuario.findUnique({
      where: { id: mentorId },
      include: {
        PerfilMentor: true
      }
    });

    if (!mentor || mentor.rol !== 'MENTOR') {
      return NextResponse.json(
        { error: 'Mentor no encontrado' },
        { status: 404 }
      );
    }

    if (!mentor.PerfilMentor || !mentor.PerfilMentor.disponible) {
      return NextResponse.json(
        { error: 'El mentor no está disponible actualmente' },
        { status: 400 }
      );
    }

    // Verificar que el mentor esté aceptando nuevos clientes
    if (!mentor.PerfilMentor.acceptingNewClients) {
      return NextResponse.json(
        { error: 'Este mentor no está aceptando nuevos clientes en este momento' },
        { status: 400 }
      );
    }

    // Verificar límite de clientes de disciplina
    if (mentor.PerfilMentor.maxDisciplineClients) {
      const clientesActuales = await prisma.disciplineSubscription.count({
        where: {
          mentorId: mentorId,
          status: 'ACTIVE',
        },
      });

      if (clientesActuales >= mentor.PerfilMentor.maxDisciplineClients) {
        return NextResponse.json(
          { error: `Este mentor ha alcanzado su límite de clientes (${mentor.PerfilMentor.maxDisciplineClients})` },
          { status: 400 }
        );
      }
    }

    // Generar ID único para la orden
    const orderId = `PKG-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Crear orden de paquete SIN visionId (lobo solitario)
    const orden = await prisma.mentorPackageOrder.create({
      data: {
        id: orderId,
        usuarioId: session.user.id,
        mentorId: mentorId,
        visionId: 1, // ID de visión por defecto para lobos (puede ser una visión especial)
        cantidad: cantidadSesiones,
        precioUnitario: precioUnitario,
        precioTotal: precioTotal,
        currency: 'MXN',
        metodoPago: 'pendiente', // Se definirá en el siguiente paso
        status: 'PENDING',
        updatedAt: new Date(),
        paymentData: {
          plan: plan,
          frecuencia: frecuencia,
          tipoCliente: 'LOBO_SOLITARIO',
        },
      },
    });

    logger.debug(`📦 Orden de paquete creada para lobo solitario: ${orden.id}`);
    logger.debug(`   Usuario: ${session.user.id}`);
    logger.debug(`   Mentor: ${mentorId}`);
    logger.debug(`   Plan: ${plan} ${frecuencia}`);
    logger.debug(`   Sesiones: ${cantidadSesiones}`);
    logger.debug(`   Total: $${precioTotal} MXN`);

    return NextResponse.json({
      success: true,
      ordenId: orden.id,
      precioTotal: precioTotal,
      cantidadSesiones: cantidadSesiones,
    });

  } catch (error: any) {
    logger.error('❌ Error creando paquete lobo solitario:', error);
    return NextResponse.json(
      { error: 'Error al crear el paquete', details: error.message },
      { status: 500 }
    );
  }
}
