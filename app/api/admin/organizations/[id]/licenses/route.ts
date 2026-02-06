// 🎫 API Generación de Licencias con Sistema de Créditos
// Los coordinadores consumen créditos asignados por el Super Admin
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { nanoid } from 'nanoid';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

// POST: Generar licencias consumiendo créditos disponibles
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const organizationId = parseInt(id);
    const data = await request.json();

    const {
      batchName,
      tierAssigned,
      codeType,
      masterCode,
      maxUses,
      uniqueCount,
      expiresAt,
      autoAssignVision,
      generationMode = 'MASIVO', // MASIVO | INDIVIDUAL | EXTRAORDINARIO
      studentName,
    } = data;

    // Validar organización
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    // Verificar permisos: Solo ADMINISTRADOR puede generar licencias
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { id: true, rol: true, organizationId: true },
    });

    const isAuthorized = user?.rol === 'ADMINISTRADOR';

    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado. Solo usuarios con rol ADMINISTRADOR pueden generar licencias.' }, { status: 403 });
    }

    // Calcular cuántas licencias se necesitan
    const licenseCount = codeType === 'MASTER' ? 1 : parseInt(uniqueCount || '1');
    const capacity = codeType === 'MASTER' ? parseInt(maxUses || '100') : licenseCount;

    // ⚡ VALIDACIÓN DE CRÉDITOS: Solo para roles que NO son ADMINISTRADOR
    // El ADMINISTRADOR puede generar licencias sin créditos previos (se pagan después)
    let availableCredits: any[] = [];
    let totalAvailable = 0;
    
    if (user.rol !== 'ADMINISTRADOR') {
      availableCredits = await prisma.schoolCredit.findMany({
        where: {
          organizationId,
          planType: tierAssigned,
          isActive: true,
          OR: [
            { expirationDate: null }, // Sin expiración
            { expirationDate: { gte: new Date() } }, // No expirado
          ],
        },
        orderBy: [
          { expirationDate: 'asc' }, // Consumir primero los que vencen antes
          { createdAt: 'asc' },
        ],
      });

      totalAvailable = availableCredits.reduce(
        (sum, credit) => sum + (credit.totalPurchased - credit.totalAllocated),
        0
      );

      // Verificar si hay suficientes créditos
      if (totalAvailable < capacity) {
        return NextResponse.json(
          {
            error: `Créditos insuficientes. Disponibles: ${totalAvailable}, Necesarios: ${capacity}`,
            available: totalAvailable,
            required: capacity,
          },
          { status: 400 }
        );
      }
    }

    // Generar códigos
    const licenses = [];
    let expirationDate = expiresAt ? new Date(expiresAt) : null;

    // Si hay autoAssignVision, obtener la fecha de fin de la visión
    if (autoAssignVision) {
      const vision = await prisma.vision.findFirst({
        where: {
          nombre: autoAssignVision,
          organizationId,
          isActive: true,
        },
        select: { endDate: true },
      });

      if (vision?.endDate) {
        expirationDate = new Date(vision.endDate);
        logger.debug(`✅ Licencias vinculadas a visión "${autoAssignVision}" expirarán el: ${expirationDate.toISOString()}`);
      }
    }

    if (codeType === 'MASTER') {
      // Generar UN código maestro
      licenses.push({
        code: masterCode,
        batchName,
        organizationId,
        tierAssigned,
        maxUses: parseInt(maxUses || '100'),
        usedCount: 0,
        isMasterCode: true,
        autoAssignVision: autoAssignVision || null,
        generatedBy: user.id,
        generationMode,
        studentName: studentName || null,
        isRevoked: false,
        expiresAt: expirationDate,
        isActive: true,
      });
    } else {
      // Generar N códigos únicos
      const count = parseInt(uniqueCount || '1');
      for (let i = 0; i < count; i++) {
        licenses.push({
          code: `${organization.slug.toUpperCase()}-${nanoid(8)}`,
          batchName,
          organizationId,
          tierAssigned,
          maxUses: 1, // Códigos únicos solo se pueden canjear una vez
          usedCount: 0,
          isMasterCode: false,
          autoAssignVision: autoAssignVision || null,
          generatedBy: user.id,
          generationMode,
          studentName: null,
          isRevoked: false,
          expiresAt: expirationDate,
          isActive: true,
        });
      }
    }

    // Crear las licencias en la base de datos
    const createdLicenses = await prisma.$transaction(
      licenses.map((license) =>
        prisma.license.create({
          data: license,
        })
      )
    );

    // 💳 CONSUMIR CRÉDITOS: Solo para roles que NO son ADMINISTRADOR
    // El ADMINISTRADOR genera licencias sin consumir créditos (se crean después del pago)
    if (user.rol !== 'ADMINISTRADOR') {
      let remainingCapacity = capacity;
      const creditUpdates = [];

      for (const credit of availableCredits) {
        if (remainingCapacity <= 0) break;

        const creditAvailable = credit.totalPurchased - credit.totalAllocated;
        const toConsume = Math.min(creditAvailable, remainingCapacity);

        creditUpdates.push(
          prisma.schoolCredit.update({
            where: { id: credit.id },
            data: {
              totalAllocated: credit.totalAllocated + toConsume,
            },
          })
        );

        remainingCapacity -= toConsume;
      }

      // Ejecutar actualizaciones de créditos
      await prisma.$transaction(creditUpdates);
    }

    // Actualizar contador de licencias en la organización
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        totalLicenses: { increment: licenseCount },
        activeLicenses: { increment: licenseCount },
      },
    });

    // 💰 CREAR ORDEN DE PAGO para SCHOOL_ADMIN (director de la escuela)
    let paymentOrder = null;
    if (user.rol === 'ADMINISTRADOR') {
      // Obtener el precio de licencia de la organización
      const pricePerLicense = tierAssigned === 'PREMIUM' 
        ? (organization.premiumLicensePrice || 500) 
        : (organization.standardLicensePrice || 300);
      
      const totalAmount = capacity * pricePerLicense;

      // Obtener el director de la escuela
      const schoolAdmin = await prisma.usuario.findUnique({
        where: { id: organization.schoolAdminId! },
        select: { id: true, nombre: true, email: true },
      });

      if (schoolAdmin) {
        // Crear orden de pago PENDING para el director
        paymentOrder = await prisma.licenseOrder.create({
          data: {
            organizationId,
            requestedBy: schoolAdmin.id, // Asociado al director
            quantity: capacity,
            tier: tierAssigned,
            amount: totalAmount,
            status: 'PENDING',
            paymentMethod: 'transfer', // Por defecto, el director puede elegir después
            paymentData: {
              unitPrice: pricePerLicense,
              generatedByAdmin: true,
              adminId: user.id,
              batchName: batchName || 'Licencias generadas por admin',
              createdAt: new Date().toISOString(),
            },
          },
        });

        // 📢 CREAR NOTIFICACIÓN para el director
        await prisma.notificacion.create({
          data: {
            usuarioId: schoolAdmin.id,
            tipo: 'PAGO_PENDIENTE',
            titulo: '💳 Pago de Licencias Pendiente',
            mensaje: `Se generaron ${capacity} licencia(s) ${tierAssigned}. Total a pagar: $${totalAmount.toFixed(2)} MXN. Por favor completa el pago.`,
            leido: false,
            metadata: {
              orderId: paymentOrder.id,
              quantity: capacity,
              amount: totalAmount,
              tier: tierAssigned,
            },
          },
        });

        logger.debug('✅ Orden de pago y notificación creadas para el director:', {
          orderId: paymentOrder.id,
          schoolAdmin: schoolAdmin.email,
          amount: totalAmount,
        });
      }
    }

    return NextResponse.json(
      {
        message: `✅ Se generaron ${licenseCount} codigo con capacidad total de ${capacity} licencias`,
        licenses: createdLicenses.map((l: any) => ({
          id: l.id,
          code: l.code,
          tierAssigned: l.tierAssigned,
          maxUses: l.maxUses,
          isMasterCode: l.isMasterCode,
        })),
        creditsConsumed: user.rol === 'ADMINISTRADOR' ? 0 : capacity,
        remainingCredits: user.rol === 'ADMINISTRADOR' ? 'N/A (pago pendiente)' : totalAvailable - capacity,
        paymentRequired: user.rol === 'ADMINISTRADOR',
        paymentOrder: paymentOrder ? {
          id: paymentOrder.id,
          amount: paymentOrder.amount,
          status: paymentOrder.status,
        } : null,
      },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error('Error generating licenses:', error);

    // Manejar error de código duplicado
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'El código ya existe. Por favor, elige otro código maestro.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al generar licencias', details: error.message },
      { status: 500 }
    );
  }
}

// GET: Listar licencias de una organización
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const organizationId = parseInt(id);

    const licenses = await prisma.license.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        batchName: true,
        tierAssigned: true,
        maxUses: true,
        usedCount: true,
        isMasterCode: true,
        autoAssignVision: true,
        generatedBy: true,
        generationMode: true,
        studentName: true,
        isRevoked: true,
        revokedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(licenses);
  } catch (error) {
    logger.error('Error fetching licenses:', error);
    return NextResponse.json({ error: 'Error al obtener licencias' }, { status: 500 });
  }
}
