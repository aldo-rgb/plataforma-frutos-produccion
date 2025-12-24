// 🏦 API BANCO CENTRAL DE LICENCIAS - Super Admin asigna créditos a escuelas
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

// GET: Lista todos los créditos asignados (con filtros)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    const whereClause = organizationId ? { organizationId: parseInt(organizationId) } : {};

    const credits = await prisma.schoolCredit.findMany({
      where: whereClause,
      include: {
        Organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcular saldo disponible para cada crédito
    const creditsWithBalance = credits.map((credit) => ({
      ...credit,
      available: credit.totalPurchased - credit.totalAllocated,
      utilizationRate: credit.totalPurchased > 0
        ? ((credit.totalAllocated / credit.totalPurchased) * 100).toFixed(2)
        : '0.00',
    }));

    return NextResponse.json(creditsWithBalance);
  } catch (error) {
    console.error('Error fetching school credits:', error);
    return NextResponse.json({ error: 'Error al obtener créditos' }, { status: 500 });
  }
}

// POST: Super Admin asigna nuevos créditos a una escuela
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const data = await request.json();
    const {
      organizationId,
      planType,
      totalPurchased,
      unitPrice,
      expirationDate,
      notes,
    } = data;

    // Validaciones
    if (!organizationId || !planType || !totalPurchased || totalPurchased <= 0) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios: organizationId, planType, totalPurchased' },
        { status: 400 }
      );
    }

    // Verificar que la organización exista
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    // Calcular monto total
    const totalPaid = totalPurchased * (unitPrice || 0);

    // Crear registro de crédito
    const schoolCredit = await prisma.schoolCredit.create({
      data: {
        organizationId,
        planType,
        totalPurchased,
        totalAllocated: 0, // Siempre inicia en 0
        unitPrice: unitPrice || (planType === 'STANDARD' ? 600 : 1250),
        totalPaid,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        isActive: true,
        notes: notes || null,
      },
      include: {
        Organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json(schoolCredit, { status: 201 });
  } catch (error) {
    console.error('Error creating school credit:', error);
    return NextResponse.json({ error: 'Error al crear crédito escolar' }, { status: 500 });
  }
}
