import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

/**
 * 📋 API: Obtener Configuración de Organización
 * GET /api/admin/organizations/[id]/config
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que sea admin o school admin
    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { rol: true }
    });

    if (!user || !['ADMIN', 'COORDINADOR'].includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const organizationId = parseInt(params.id);

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        standardLicensePrice: true,
        premiumLicensePrice: true,
        visionCycleDuration: true,
        renewalOfferEnabled: true,
        renewalOfferDiscount: true,
        totalLicenses: true,
        activeLicenses: true,
        totalStudents: true,
        status: true
      }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      organization
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo configuración:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 💾 API: Actualizar Configuración de Organización
 * PUT /api/admin/organizations/[id]/config
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que sea admin o school admin
    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { rol: true }
    });

    if (!user || !['ADMIN', 'COORDINADOR'].includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const organizationId = parseInt(params.id);
    const {
      standardLicensePrice,
      premiumLicensePrice,
      visionCycleDuration,
      renewalOfferEnabled,
      renewalOfferDiscount
    } = await req.json();

    // Validaciones
    if (standardLicensePrice < 0 || premiumLicensePrice < 0) {
      return NextResponse.json({ error: 'Los precios no pueden ser negativos' }, { status: 400 });
    }

    if (visionCycleDuration < 1 || visionCycleDuration > 12) {
      return NextResponse.json({ error: 'La duración debe estar entre 1 y 12 meses' }, { status: 400 });
    }

    if (renewalOfferDiscount < 0 || renewalOfferDiscount > 100) {
      return NextResponse.json({ error: 'El descuento debe estar entre 0 y 100%' }, { status: 400 });
    }

    // Actualizar organización
    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        standardLicensePrice,
        premiumLicensePrice,
        visionCycleDuration,
        renewalOfferEnabled,
        renewalOfferDiscount
      }
    });

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
      message: 'Configuración actualizada exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error actualizando configuración:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
