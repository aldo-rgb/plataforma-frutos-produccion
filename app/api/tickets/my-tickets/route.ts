import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Mapear VisionLevel a ProductLevelType
const levelToProductLevel: Record<string, string> = {
  'BASIC': 'BASIC',
  'ADVANCED': 'ADVANCED', 
  'PL': 'PL',
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Buscar usuario con más datos
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        nombre: true, 
        profileImage: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Obtener todos los tickets del usuario
    const tickets = await prisma.ticket.findMany({
      where: {
        ownerId: user.id,
      },
      include: {
        vision: {
          select: {
            id: true,
            nombre: true,
            startDate: true,
            endDate: true,
            advancedStartDate: true,
            advancedEndDate: true,
            plWeekend1StartDate: true,
            plWeekend3EndDate: true,
          },
        },
        organization: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Para cada ticket, buscar el producto correspondiente para obtener la imagen
    const ticketsWithProducts = await Promise.all(
      tickets.map(async (ticket) => {
        // Buscar el producto que corresponde a este ticket
        const product = await prisma.schoolProduct.findFirst({
          where: {
            visionId: ticket.visionId,
            levelType: levelToProductLevel[ticket.level] as any,
            organizationId: ticket.organizationId,
          },
          select: {
            id: true,
            name: true,
            imageUrl: true,
            description: true,
            location: true,
            type: true,
          },
        });

        return {
          id: ticket.id,
          type: ticket.type,
          level: ticket.level,
          status: ticket.status,
          paymentStatus: ticket.paymentStatus,
          costAtPurchase: ticket.costAtPurchase ? parseFloat(ticket.costAtPurchase.toString()) : 0,
          amountPaid: ticket.amountPaid ? parseFloat(ticket.amountPaid.toString()) : 0,
          isTransferable: ticket.isTransferable,
          validUntil: ticket.validUntil?.toISOString() || null,
          purchasePrice: ticket.purchasePrice ? parseFloat(ticket.purchasePrice.toString()) : null,
          createdAt: ticket.createdAt.toISOString(),
          vision: {
            id: ticket.vision.id,
            nombre: ticket.vision.nombre,
            // Fechas de BASIC
            startDate: ticket.vision.startDate?.toISOString() || '',
            endDate: ticket.vision.endDate?.toISOString() || null,
            // Fechas de ADVANCED
            advancedStartDate: ticket.vision.advancedStartDate?.toISOString() || null,
            advancedEndDate: ticket.vision.advancedEndDate?.toISOString() || null,
            // Fechas de PL (Liderato)
            plStartDate: ticket.vision.plWeekend1StartDate?.toISOString() || null,
            plEndDate: ticket.vision.plWeekend3EndDate?.toISOString() || null,
          },
          organization: {
            name: ticket.organization.name,
            logoUrl: ticket.organization.logoUrl,
          },
          product: product ? {
            id: product.id,
            name: product.name,
            imageUrl: product.imageUrl,
            description: product.description,
            location: product.location,
            type: product.type,
          } : null,
        };
      })
    );

    // Generar iniciales del usuario
    const userName = user.nombre || 'Usuario';
    const nameParts = userName.split(' ');
    const userInitials = nameParts.length >= 2 
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : userName.substring(0, 2).toUpperCase();

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: userName,
        initials: userInitials,
        photo: user.profileImage,
        memberSince: user.createdAt.toISOString(),
      },
      tickets: ticketsWithProducts,
    });
  } catch (error) {
    logger.error('Error fetching tickets:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener tickets' },
      { status: 500 }
    );
  }
}
