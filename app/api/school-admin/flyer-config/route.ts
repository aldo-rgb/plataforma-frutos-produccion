import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener configuración del flyer
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    if (session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true }
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes una organización asignada' },
        { status: 400 }
      );
    }

    // Obtener la organización con configuración del flyer
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        flyerBackgroundUrl: true,
        flyerHeadline: true,
        flyerSubheadline: true,
        flyerLocationDetail: true,
        flyerShowUrgencyBadge: true,
        flyerUrgencyText: true,
        flyerCtaText: true,
        flyerWhatsappNumber: true,
      }
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    // Buscar la próxima visión activa
    const nextVision = await prisma.vision.findFirst({
      where: {
        organizationId: user.organizationId,
        tipo: 'BASIC',
        status: 'ACTIVE',
        fechaInicio: { gte: new Date() }
      },
      orderBy: { fechaInicio: 'asc' },
      select: {
        id: true,
        nombre: true,
        fechaInicio: true,
        fechaFin: true,
        lugar: true,
      }
    });

    let visionData = null;
    if (nextVision) {
      const formatDate = (d: Date) => d.toLocaleDateString('es-MX', { 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      });
      
      visionData = {
        id: nextVision.id,
        nombre: nextVision.nombre,
        fechas: nextVision.fechaInicio 
          ? nextVision.fechaFin 
            ? `${formatDate(nextVision.fechaInicio)} - ${formatDate(nextVision.fechaFin)}`
            : formatDate(nextVision.fechaInicio)
          : null,
        lugar: nextVision.lugar,
      };
    }

    return NextResponse.json({
      success: true,
      config: organization,
      organization: {
        id: organization.id,
        name: organization.name,
        logoUrl: organization.logoUrl,
      },
      nextVision: visionData,
    });

  } catch (error) {
    console.error('Error fetching flyer config:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la configuración' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar configuración del flyer
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    if (session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true }
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes una organización asignada' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      flyerBackgroundUrl,
      flyerHeadline,
      flyerSubheadline,
      flyerLocationDetail,
      flyerShowUrgencyBadge,
      flyerUrgencyText,
      flyerCtaText,
      flyerWhatsappNumber,
    } = body;

    // Actualizar la organización
    const updatedOrg = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        flyerBackgroundUrl: flyerBackgroundUrl || null,
        flyerHeadline: flyerHeadline || null,
        flyerSubheadline: flyerSubheadline || null,
        flyerLocationDetail: flyerLocationDetail || null,
        flyerShowUrgencyBadge: flyerShowUrgencyBadge ?? true,
        flyerUrgencyText: flyerUrgencyText || 'CUPO LIMITADO',
        flyerCtaText: flyerCtaText || 'Escanea para registrarte',
        flyerWhatsappNumber: flyerWhatsappNumber || null,
      },
      select: {
        id: true,
        flyerBackgroundUrl: true,
        flyerHeadline: true,
        flyerSubheadline: true,
        flyerLocationDetail: true,
        flyerShowUrgencyBadge: true,
        flyerUrgencyText: true,
        flyerCtaText: true,
        flyerWhatsappNumber: true,
      }
    });

    return NextResponse.json({
      success: true,
      config: updatedOrg,
      message: 'Configuración guardada correctamente'
    });

  } catch (error) {
    console.error('Error updating flyer config:', error);
    return NextResponse.json(
      { success: false, error: 'Error al guardar la configuración' },
      { status: 500 }
    );
  }
}
