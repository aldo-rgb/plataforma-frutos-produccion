import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener presupuestos de la visión
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');

    if (!visionId) {
      return NextResponse.json({ error: 'visionId requerido' }, { status: 400 });
    }

    // Verificar acceso a la visión
    const hasAccess = await checkVisionAccess(userId, parseInt(visionId));
    if (!hasAccess.allowed) {
      return NextResponse.json({ error: hasAccess.error }, { status: 403 });
    }

    // Obtener todos los presupuestos de la visión
    const budgets = await prisma.tribeBudget.findMany({
      where: { visionId: parseInt(visionId) },
      include: {
        TribeBudgetItem: true,
        TribeBudgetPayment: {
          include: {
            Usuario_TribeBudgetPayment_userIdToUsuario: {
              select: { id: true, nombre: true, email: true, profileImage: true }
            },
            Usuario_TribeBudgetPayment_verifiedByIdToUsuario: {
              select: { id: true, nombre: true }
            }
          }
        },
        Usuario: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Obtener miembros de AMBAS fuentes: vision_enrollments Y VisionParticipante
    const visionEnrollments = await prisma.vision_enrollments.findMany({
      where: { 
        visionId: parseInt(visionId),
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE', 'COMPLETED'] }
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: { id: true, nombre: true, email: true, profileImage: true }
        }
      },
      distinct: ['userId']
    });

    const visionParticipantes = await prisma.visionParticipante.findMany({
      where: { visionId: parseInt(visionId) },
      include: {
        Usuario_VisionParticipante_participanteIdToUsuario: {
          select: { id: true, nombre: true, email: true, profileImage: true }
        }
      }
    });

    // Combinar miembros de ambas fuentes (sin duplicados)
    const memberMap = new Map<number, { id: number; nombre: string; email: string; profileImage: string | null }>();
    
    visionEnrollments.forEach(ve => {
      const user = ve.Usuario_vision_enrollments_userIdToUsuario;
      if (!memberMap.has(user.id)) {
        memberMap.set(user.id, {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          profileImage: user.profileImage
        });
      }
    });
    
    visionParticipantes.forEach(vp => {
      const user = vp.Usuario_VisionParticipante_participanteIdToUsuario;
      if (!memberMap.has(user.id)) {
        memberMap.set(user.id, {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          profileImage: user.profileImage
        });
      }
    });

    const members = Array.from(memberMap.values());

    // Formatear presupuestos con estadísticas
    const formattedBudgets = budgets.map(budget => {
      const payments = budget.TribeBudgetPayment;
      const totalPaid = payments.filter(p => p.isPaid).reduce((sum, p) => sum + Number(p.amount), 0);
      const totalPending = payments.filter(p => !p.isPaid).reduce((sum, p) => sum + Number(p.amount), 0);
      const paidCount = payments.filter(p => p.isPaid).length;
      const pendingCount = payments.filter(p => !p.isPaid).length;

      return {
        id: budget.id,
        name: budget.name,
        description: budget.description,
        totalAmount: Number(budget.totalAmount),
        isActive: budget.isActive,
        createdAt: budget.createdAt,
        createdBy: budget.Usuario,
        items: budget.TribeBudgetItem.map(item => ({
          id: item.id,
          concept: item.concept,
          amount: Number(item.amount)
        })),
        payments: payments.map(p => ({
          id: p.id,
          userId: p.userId,
          user: p.Usuario_TribeBudgetPayment_userIdToUsuario,
          amount: Number(p.amount),
          isPaid: p.isPaid,
          paidAt: p.paidAt,
          verifiedBy: p.Usuario_TribeBudgetPayment_verifiedByIdToUsuario,
          proofImage: p.proofImage,
          notes: p.notes
        })),
        stats: {
          totalPaid,
          totalPending,
          paidCount,
          pendingCount,
          totalMembers: payments.length,
          progress: payments.length > 0 ? Math.round((paidCount / payments.length) * 100) : 0
        }
      };
    });

    return NextResponse.json({
      success: true,
      budgets: formattedBudgets,
      members,
      isTreasurer: hasAccess.isTreasurer
    });

  } catch (error) {
    console.error('Error al obtener presupuestos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST - Crear presupuesto o gestionar pagos
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const { action, visionId, ...data } = await request.json();

    if (!visionId) {
      return NextResponse.json({ error: 'visionId requerido' }, { status: 400 });
    }

    // Verificar que el usuario es tesorero
    const hasAccess = await checkVisionAccess(userId, parseInt(visionId));
    if (!hasAccess.isTreasurer) {
      return NextResponse.json({ error: 'Solo el Tesorero puede realizar esta acción' }, { status: 403 });
    }

    switch (action) {
      case 'create_budget': {
        const { name, description, items, memberIds } = data;

        if (!name || !items || !Array.isArray(items) || items.length === 0) {
          return NextResponse.json({ error: 'Nombre y al menos un concepto requeridos' }, { status: 400 });
        }

        // Calcular total
        const totalAmount = items.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);

        // Crear presupuesto
        const budget = await prisma.tribeBudget.create({
          data: {
            visionId: parseInt(visionId),
            name,
            description,
            totalAmount,
            createdById: userId,
            TribeBudgetItem: {
              create: items.map((item: any) => ({
                concept: item.concept,
                amount: parseFloat(item.amount) || 0
              }))
            }
          }
        });

        // Si se proporcionan miembros, crear los pagos pendientes
        if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
          const amountPerMember = totalAmount; // Cada miembro paga el total del presupuesto
          
          await prisma.tribeBudgetPayment.createMany({
            data: memberIds.map((memberId: number) => ({
              budgetId: budget.id,
              userId: memberId,
              amount: amountPerMember,
              isPaid: false
            }))
          });
        }

        return NextResponse.json({
          success: true,
          budget,
          message: 'Presupuesto creado correctamente'
        });
      }

      case 'add_members_to_budget': {
        const { budgetId, memberIds } = data;

        if (!budgetId || !memberIds || !Array.isArray(memberIds)) {
          return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        // Obtener el presupuesto
        const budget = await prisma.tribeBudget.findUnique({
          where: { id: budgetId }
        });

        if (!budget) {
          return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });
        }

        // Crear pagos pendientes para los nuevos miembros
        const existingPayments = await prisma.tribeBudgetPayment.findMany({
          where: { budgetId },
          select: { userId: true }
        });
        const existingUserIds = existingPayments.map(p => p.userId);

        const newMembers = memberIds.filter((id: number) => !existingUserIds.includes(id));

        if (newMembers.length > 0) {
          await prisma.tribeBudgetPayment.createMany({
            data: newMembers.map((memberId: number) => ({
              budgetId,
              userId: memberId,
              amount: Number(budget.totalAmount),
              isPaid: false
            }))
          });
        }

        return NextResponse.json({
          success: true,
          addedCount: newMembers.length,
          message: `${newMembers.length} miembros agregados al presupuesto`
        });
      }

      case 'toggle_payment': {
        const { budgetId, memberId, isPaid } = data;

        if (!budgetId || !memberId) {
          return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        // Buscar o crear el registro de pago
        const existingPayment = await prisma.tribeBudgetPayment.findUnique({
          where: {
            budgetId_userId: {
              budgetId,
              userId: memberId
            }
          }
        });

        if (!existingPayment) {
          // Si no existe, obtener el monto del presupuesto y crear
          const budget = await prisma.tribeBudget.findUnique({
            where: { id: budgetId }
          });

          if (!budget) {
            return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });
          }

          await prisma.tribeBudgetPayment.create({
            data: {
              budgetId,
              userId: memberId,
              amount: Number(budget.totalAmount),
              isPaid: isPaid,
              paidAt: isPaid ? new Date() : null,
              verifiedById: isPaid ? userId : null
            }
          });
        } else {
          // Actualizar existente
          await prisma.tribeBudgetPayment.update({
            where: { id: existingPayment.id },
            data: {
              isPaid,
              paidAt: isPaid ? new Date() : null,
              verifiedById: isPaid ? userId : null
            }
          });
        }

        return NextResponse.json({
          success: true,
          message: isPaid ? 'Pago registrado' : 'Pago desmarcado'
        });
      }

      case 'delete_budget': {
        const { budgetId } = data;

        if (!budgetId) {
          return NextResponse.json({ error: 'budgetId requerido' }, { status: 400 });
        }

        await prisma.tribeBudget.delete({
          where: { id: budgetId }
        });

        return NextResponse.json({
          success: true,
          message: 'Presupuesto eliminado'
        });
      }

      case 'toggle_budget_active': {
        const { budgetId, isActive } = data;

        if (!budgetId) {
          return NextResponse.json({ error: 'budgetId requerido' }, { status: 400 });
        }

        await prisma.tribeBudget.update({
          where: { id: budgetId },
          data: { isActive }
        });

        return NextResponse.json({
          success: true,
          message: isActive ? 'Presupuesto activado' : 'Presupuesto archivado'
        });
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error en presupuestos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// Helper para verificar acceso a la visión
async function checkVisionAccess(userId: number, visionId: number) {
  // Verificar si es tesorero
  const treasurerAssignment = await prisma.tribeCaptainAssignment.findFirst({
    where: {
      userId,
      status: 'ACCEPTED',
      captaincy: {
        visionId,
        roleType: 'TREASURER'
      }
    }
  });

  // Verificar si es Capitán de Tribu o Co-Capitán
  const isTribeCaptainOrCoCaptain = await prisma.tribeCaptainAssignment.findFirst({
    where: {
      userId,
      status: 'ACCEPTED',
      captaincy: {
        visionId,
        roleType: { in: ['TRIBE_CAPTAIN', 'TRIBE_CO_CAPTAIN'] }
      }
    }
  });

  // Verificar si es staff
  const isStaff = await prisma.visionStaff.findFirst({
    where: { userId, visionId }
  });

  // Verificar si es coordinador
  const vision = await prisma.vision.findUnique({
    where: { id: visionId },
    select: { coordinadorId: true }
  });

  const isTreasurer = !!treasurerAssignment || !!isTribeCaptainOrCoCaptain;
  const allowed = isTreasurer || !!isStaff || vision?.coordinadorId === userId;

  return {
    allowed,
    isTreasurer,
    error: allowed ? null : 'No tienes acceso a esta visión'
  };
}
