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

    // Verificar si es Capitán de Tribu o Co-Capitán (tienen acceso a todos los widgets)
    const isTribeCaptainOrCoCaptain = await prisma.tribeCaptainAssignment.findFirst({
      where: {
        userId: userId,
        status: 'ACCEPTED',
        captaincy: {
          visionId: parseInt(visionId),
          roleType: { in: ['TRIBE_CAPTAIN', 'TRIBE_CO_CAPTAIN'] }
        }
      }
    });

    const vision = await prisma.vision.findUnique({
      where: { id: parseInt(visionId) },
      select: { coordinadorId: true, nombre: true }
    });

    const isTreasurer = !!treasurerAssignment || !!isTribeCaptainOrCoCaptain;
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
        TribeCommunityProject: {
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

    // Obtener tallas desde los votos de encuestas de LOGO
    const logoPolls = await prisma.tribePoll.findMany({
      where: { 
        visionId: parseInt(visionId),
        category: 'LOGO'
      },
      include: {
        votes: {
          where: { shirtSize: { not: null } },
          include: {
            user: {
              select: { id: true, nombre: true, email: true, profileImage: true }
            }
          }
        }
      }
    });

    // Combinar tallas de todos los votos de logo (usar el más reciente por usuario)
    const memberSizesMap = new Map<number, { 
      id: number; 
      oderId: number;
      userId: number; 
      size: string; 
      createdAt: Date; 
      user: { id: number; nombre: string; email: string; profileImage: string | null } 
    }>();

    logoPolls.forEach(poll => {
      poll.votes.forEach((vote: any) => {
        if (vote.shirtSize && vote.user) {
          // Si ya existe, solo actualizar si este voto es más reciente
          const existing = memberSizesMap.get(vote.userId);
          if (!existing || new Date(vote.votedAt) > new Date(existing.createdAt)) {
            memberSizesMap.set(vote.userId, {
              id: vote.id,
              oderId: vote.id,
              userId: vote.userId,
              size: vote.shirtSize,
              createdAt: vote.votedAt,
              user: vote.user
            });
          }
        }
      });
    });

    const allMemberSizes = Array.from(memberSizesMap.values());

    // Los tipos de camisetas y precio se guardan en referenceNote como JSON
    let shirtTypes: any[] = [];
    let shirtPrice = 0;
    if (bankAccount?.referenceNote) {
      try {
        const shirtConfig = JSON.parse(bankAccount.referenceNote);
        if (shirtConfig.shirtTypes) shirtTypes = shirtConfig.shirtTypes;
        if (shirtConfig.shirtPrice) shirtPrice = shirtConfig.shirtPrice;
      } catch (e) {
        // Si no es JSON válido, es una nota normal
      }
    }

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
      allMemberSizes: allMemberSizes.map(m => ({
        id: m.id,
        oderId: m.oderId,
        userId: m.userId,
        size: m.size,
        createdAt: m.createdAt,
        user: m.user
      })),
      shirtPrice,
      shirtTypes,
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

    // Verificar si es Capitán de Tribu o Co-Capitán (tienen acceso a todos los widgets)
    const isTribeCaptainOrCoCaptain = await prisma.tribeCaptainAssignment.findFirst({
      where: {
        userId: userId,
        status: 'ACCEPTED',
        captaincy: {
          visionId: parseInt(visionId),
          roleType: { in: ['TRIBE_CAPTAIN', 'TRIBE_CO_CAPTAIN'] }
        }
      }
    });

    if (!treasurerAssignment && !isTribeCaptainOrCoCaptain) {
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

      case 'configure_shirt_types': {
        const { shirtTypes } = data;

        if (!shirtTypes || !Array.isArray(shirtTypes)) {
          return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
        }

        // Verificar que la cuenta bancaria exista
        const existingBank = await prisma.tribeBankAccount.findUnique({
          where: { visionId: parseInt(visionId) }
        });

        if (!existingBank) {
          return NextResponse.json({ 
            error: 'Primero debes configurar la cuenta bancaria' 
          }, { status: 400 });
        }

        // Calcular precio total
        const totalPrice = shirtTypes.reduce((sum: number, s: any) => sum + (s.price || 0), 0);

        // Guardar tipos de camisetas y precio total en referenceNote como JSON
        const shirtConfig = JSON.stringify({ shirtTypes, shirtPrice: totalPrice });
        await prisma.tribeBankAccount.update({
          where: { visionId: parseInt(visionId) },
          data: { 
            referenceNote: shirtConfig
          }
        });

        return NextResponse.json({
          success: true,
          shirtTypes,
          shirtPrice: totalPrice,
          message: 'Cotización de camisetas configurada'
        });
      }

      case 'configure_shirt_price': {
        const { price } = data;

        if (price === undefined || price < 0) {
          return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
        }

        // Actualizar precio en la cuenta bancaria (debe existir primero)
        const existingBank = await prisma.tribeBankAccount.findUnique({
          where: { visionId: parseInt(visionId) }
        });

        if (!existingBank) {
          return NextResponse.json({ 
            error: 'Primero debes configurar la cuenta bancaria' 
          }, { status: 400 });
        }

        // Leer configuración actual de referenceNote
        let currentConfig: any = {};
        if (existingBank.referenceNote) {
          try {
            currentConfig = JSON.parse(existingBank.referenceNote);
          } catch (e) {}
        }
        currentConfig.shirtPrice = price;

        await prisma.tribeBankAccount.update({
          where: { visionId: parseInt(visionId) },
          data: { referenceNote: JSON.stringify(currentConfig) }
        });

        return NextResponse.json({
          success: true,
          shirtPrice: price,
          message: 'Precio de playera configurado'
        });
      }

      case 'toggle_shirt_payment': {
        const { memberId, size, paid } = data;

        if (!memberId || !size) {
          return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        // Obtener precio desde cuenta bancaria (guardado en referenceNote)
        const bankAccount = await prisma.tribeBankAccount.findUnique({
          where: { visionId: parseInt(visionId) }
        });

        let shirtPrice = 0;
        if (bankAccount?.referenceNote) {
          try {
            const config = JSON.parse(bankAccount.referenceNote);
            shirtPrice = config.shirtPrice || 0;
          } catch (e) {}
        }

        if (paid) {
          // Marcar como pagado: crear orden de playera e ingreso

          // Verificar si ya existe una orden para este usuario
          const existingOrder = await prisma.tribeShirtOrder.findFirst({
            where: {
              visionId: parseInt(visionId),
              userId: memberId
            }
          });

          if (existingOrder) {
            return NextResponse.json({ error: 'Ya existe un pedido para este usuario' }, { status: 400 });
          }

          // Obtener nombre del usuario
          const user = await prisma.usuario.findUnique({
            where: { id: memberId },
            select: { nombre: true, email: true }
          });

          // Crear orden de playera
          const shirtOrder = await prisma.tribeShirtOrder.create({
            data: {
              visionId: parseInt(visionId),
              userId: memberId,
              size,
              quantity: 1,
              unitPrice: shirtPrice,
              totalAmount: shirtPrice,
              status: 'PAID',
              paidAt: new Date()
            }
          });

          // Crear ingreso verificado
          await prisma.tribeIncome.create({
            data: {
              visionId: parseInt(visionId),
              bankAccountId: bankAccount?.id,
              category: 'SHIRT',
              concept: `Pago de playera - Talla ${size}`,
              amount: shirtPrice,
              payerUserId: memberId,
              payerName: user?.nombre,
              payerEmail: user?.email,
              shirtOrderId: shirtOrder.id,
              status: 'VERIFIED',
              verifiedById: userId,
              verifiedAt: new Date()
            }
          });

          return NextResponse.json({
            success: true,
            message: 'Pago registrado correctamente'
          });
        } else {
          // Desmarcar como pagado: eliminar orden e ingreso
          const existingOrder = await prisma.tribeShirtOrder.findFirst({
            where: {
              visionId: parseInt(visionId),
              userId: memberId
            }
          });

          if (existingOrder) {
            // Eliminar ingreso asociado
            await prisma.tribeIncome.deleteMany({
              where: { shirtOrderId: existingOrder.id }
            });

            // Eliminar orden
            await prisma.tribeShirtOrder.delete({
              where: { id: existingOrder.id }
            });
          }

          return NextResponse.json({
            success: true,
            message: 'Pago desmarcado'
          });
        }
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
