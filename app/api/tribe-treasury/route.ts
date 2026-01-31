import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener datos de tesorería de la visión
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

    // Verificar que el usuario es el Tesorero
    const treasurerAssignment = await prisma.tribeCaptainAssignment.findFirst({
      where: {
        userId: userId,
        status: 'ACCEPTED',
        captaincy: {
          visionId: parseInt(visionId),
          roleType: 'TREASURER'
        }
      }
    });

    // También permitir acceso a staff y coordinador
    const isStaff = await prisma.visionStaff.findFirst({
      where: {
        userId: userId,
        visionId: parseInt(visionId)
      }
    });

    const vision = await prisma.vision.findUnique({
      where: { id: parseInt(visionId) },
      select: { coordinadorId: true, nombre: true }
    });

    const isTreasurer = !!treasurerAssignment;
    const hasAccess = isTreasurer || !!isStaff || vision?.coordinadorId === userId;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No tienes acceso a la tesorería de esta visión' }, 
        { status: 403 }
      );
    }

    // Obtener cuenta bancaria
    const bankAccount = await prisma.tribeBankAccount.findUnique({
      where: { visionId: parseInt(visionId) },
      include: {
        configuredBy: {
          select: { id: true, nombre: true }
        }
      }
    });

    // Obtener ingresos con filtros opcionales
    const statusFilter = searchParams.get('status');
    const categoryFilter = searchParams.get('category');
    
    const incomeWhere: any = { visionId: parseInt(visionId) };
    if (statusFilter) incomeWhere.status = statusFilter;
    if (categoryFilter) incomeWhere.category = categoryFilter;

    const incomes = await prisma.tribeIncome.findMany({
      where: incomeWhere,
      include: {
        payer: {
          select: { id: true, nombre: true, email: true, profileImage: true }
        },
        verifiedBy: {
          select: { id: true, nombre: true }
        },
        shirtOrder: {
          select: { id: true, size: true, quantity: true }
        },
        project: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Obtener pedidos de playeras
    const shirtOrders = await prisma.tribeShirtOrder.findMany({
      where: { visionId: parseInt(visionId) },
      include: {
        user: {
          select: { id: true, nombre: true, email: true, profileImage: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calcular estadísticas
    const totalVerified = incomes
      .filter(i => i.status === 'VERIFIED')
      .reduce((sum, i) => sum + i.amount, 0);

    const totalPending = incomes
      .filter(i => i.status === 'PENDING')
      .reduce((sum, i) => sum + i.amount, 0);

    const byCategory = incomes.reduce((acc, i) => {
      if (i.status === 'VERIFIED') {
        acc[i.category] = (acc[i.category] || 0) + i.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    const shirtStats = {
      totalOrders: shirtOrders.length,
      pendingPayment: shirtOrders.filter(o => o.status === 'PENDING_PAYMENT').length,
      paid: shirtOrders.filter(o => o.status === 'PAID').length,
      delivered: shirtOrders.filter(o => o.status === 'DELIVERED').length,
      totalAmount: shirtOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    };

    return NextResponse.json({
      success: true,
      isTreasurer,
      visionName: vision?.nombre,
      bankAccount,
      incomes,
      shirtOrders,
      stats: {
        totalVerified,
        totalPending,
        byCategory,
        shirtStats
      }
    });

  } catch (error) {
    console.error('Error al obtener tesorería:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear/Actualizar cuenta bancaria o registrar ingreso
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

    // Verificar que el usuario es el Tesorero
    const treasurerAssignment = await prisma.tribeCaptainAssignment.findFirst({
      where: {
        userId: userId,
        status: 'ACCEPTED',
        captaincy: {
          visionId: parseInt(visionId),
          roleType: 'TREASURER'
        }
      }
    });

    if (!treasurerAssignment) {
      return NextResponse.json(
        { error: 'Solo el Tesorero puede realizar esta acción' }, 
        { status: 403 }
      );
    }

    switch (action) {
      case 'configure_bank_account': {
        const { bankName, accountHolder, accountNumber, clabe, accountType, alias, referenceNote } = data;

        if (!bankName || !accountHolder || !accountNumber) {
          return NextResponse.json(
            { error: 'Datos bancarios incompletos' },
            { status: 400 }
          );
        }

        // Crear o actualizar cuenta bancaria
        const bankAccount = await prisma.tribeBankAccount.upsert({
          where: { visionId: parseInt(visionId) },
          create: {
            visionId: parseInt(visionId),
            bankName,
            accountHolder,
            accountNumber,
            clabe,
            accountType: accountType || 'DEBIT',
            alias,
            referenceNote,
            configuredById: userId
          },
          update: {
            bankName,
            accountHolder,
            accountNumber,
            clabe,
            accountType: accountType || 'DEBIT',
            alias,
            referenceNote,
            configuredById: userId
          }
        });

        return NextResponse.json({
          success: true,
          bankAccount,
          message: 'Cuenta bancaria configurada correctamente'
        });
      }

      case 'verify_income': {
        const { incomeId, approved, rejectionReason } = data;

        if (!incomeId) {
          return NextResponse.json({ error: 'incomeId requerido' }, { status: 400 });
        }

        const income = await prisma.tribeIncome.update({
          where: { id: incomeId },
          data: {
            status: approved ? 'VERIFIED' : 'REJECTED',
            verifiedById: userId,
            verifiedAt: new Date(),
            rejectionReason: approved ? null : rejectionReason
          }
        });

        // Si es pago de playera y fue verificado, actualizar el pedido
        if (approved && income.shirtOrderId) {
          await prisma.tribeShirtOrder.update({
            where: { id: income.shirtOrderId },
            data: {
              status: 'PAID',
              paidAt: new Date()
            }
          });
        }

        return NextResponse.json({
          success: true,
          income,
          message: approved ? 'Ingreso verificado' : 'Ingreso rechazado'
        });
      }

      case 'update_shirt_order_status': {
        const { orderId, newStatus } = data;

        if (!orderId || !newStatus) {
          return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        const updateData: any = { status: newStatus };
        
        if (newStatus === 'IN_PRODUCTION') updateData.producedAt = new Date();
        if (newStatus === 'DELIVERED') updateData.deliveredAt = new Date();

        const order = await prisma.tribeShirtOrder.update({
          where: { id: orderId },
          data: updateData
        });

        return NextResponse.json({
          success: true,
          order,
          message: 'Estado del pedido actualizado'
        });
      }

      case 'register_manual_income': {
        const { category, concept, amount, payerName, payerEmail, proofImage, proofNotes, projectId } = data;

        if (!category || !concept || !amount) {
          return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        // Obtener cuenta bancaria si existe
        const bankAccount = await prisma.tribeBankAccount.findUnique({
          where: { visionId: parseInt(visionId) }
        });

        const income = await prisma.tribeIncome.create({
          data: {
            visionId: parseInt(visionId),
            bankAccountId: bankAccount?.id,
            category,
            concept,
            amount: parseFloat(amount),
            payerName,
            payerEmail,
            proofImage,
            proofNotes,
            projectId: projectId ? parseInt(projectId) : null,
            status: 'VERIFIED', // Manual por tesorero = ya verificado
            verifiedById: userId,
            verifiedAt: new Date()
          }
        });

        return NextResponse.json({
          success: true,
          income,
          message: 'Ingreso registrado correctamente'
        });
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error en tesorería:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
